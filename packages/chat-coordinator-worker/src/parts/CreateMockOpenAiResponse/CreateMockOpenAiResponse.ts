interface MockOpenAiResponseContentItem {
  readonly annotations: readonly []
  readonly text: string
  readonly type: 'output_text'
}

interface MockOpenAiResponseOutputItem {
  readonly content: readonly [MockOpenAiResponseContentItem]
  readonly id: 'msg_mock_0001'
  readonly role: 'assistant'
  readonly status: 'completed'
  readonly type: 'message'
}

interface MockOpenAiResponse {
  readonly created_at: 0
  readonly id: 'resp_mock_0001'
  readonly model: string
  readonly object: 'response'
  readonly output: readonly [MockOpenAiResponseOutputItem]
  readonly output_text: string
  readonly parallel_tool_calls: boolean
  readonly status: 'completed'
  readonly tools: readonly []
}

type ParsedMockOpenAiResponse = MockOpenAiResponse | Record<string, unknown>

const lastRequestSummaryToken = '__MOCK_OPENAPI_LAST_REQUEST_SUMMARY__'

const getLastRequestSummary = (body: unknown): string => {
  if (!body || typeof body !== 'object') {
    return 'mock-request-summary images=0 text-files=0'
  }
  const input = Reflect.get(body, 'input')
  if (!Array.isArray(input) || input.length === 0) {
    return 'mock-request-summary images=0 text-files=0'
  }
  let imageCount = 0
  let textFileCount = 0
  for (const item of input) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const content = Reflect.get(item, 'content')
    if (!Array.isArray(content)) {
      continue
    }
    for (const part of content) {
      if (!part || typeof part !== 'object') {
        continue
      }
      const type = Reflect.get(part, 'type')
      if (type === 'input_image') {
        imageCount++
        continue
      }
      if (type !== 'input_text') {
        continue
      }
      const text = Reflect.get(part, 'text')
      if (typeof text === 'string' && text.startsWith('Attached text file "')) {
        textFileCount++
      }
    }
  }
  return `mock-request-summary images=${imageCount} text-files=${textFileCount}`
}

const getModel = (body: unknown): string => {
  if (!body || typeof body !== 'object') {
    return 'mock-model'
  }
  const model = Reflect.get(body, 'model')
  if (typeof model !== 'string') {
    return 'mock-model'
  }
  return model
}

const parseSseDataLines = (text: string): readonly string[] => {
  const rawEvents = text.split('\n\n')
  const dataLines: string[] = []
  for (const rawEvent of rawEvents) {
    if (!rawEvent) {
      continue
    }
    const lines = rawEvent.split('\n')
    for (const line of lines) {
      if (!line.startsWith('data:')) {
        continue
      }
      dataLines.push(line.slice(5).trimStart())
    }
  }
  return dataLines
}

const isSseMockResponse = (text: string): boolean => {
  return text.includes('\ndata:') || text.startsWith('data:')
}

const getOutputTextFromResponse = (response: Record<string, unknown>): string | undefined => {
  const outputText = Reflect.get(response, 'output_text')
  if (typeof outputText === 'string' && outputText) {
    return outputText
  }
  const output = Reflect.get(response, 'output')
  if (!Array.isArray(output)) {
    return undefined
  }
  const parts: string[] = []
  for (const item of output) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const content = Reflect.get(item, 'content')
    if (!Array.isArray(content)) {
      continue
    }
    for (const part of content) {
      if (!part || typeof part !== 'object') {
        continue
      }
      const text = Reflect.get(part, 'text')
      if (typeof text === 'string' && text) {
        parts.push(text)
      }
    }
  }
  const joined = parts.join('')
  return joined || undefined
}

const parseSseMockResponse = (body: unknown, text: string): ParsedMockOpenAiResponse | undefined => {
  const dataLines = parseSseDataLines(text)
  if (dataLines.length === 0) {
    return undefined
  }
  let accumulatedText = ''
  let completedResponse: Record<string, unknown> | undefined
  for (const line of dataLines) {
    if (line === '[DONE]') {
      continue
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(line) as unknown
    } catch {
      continue
    }
    if (!parsed || typeof parsed !== 'object') {
      continue
    }
    const eventType = Reflect.get(parsed, 'type')
    if (eventType === 'response.output_text.delta') {
      const delta = Reflect.get(parsed, 'delta')
      if (typeof delta === 'string') {
        accumulatedText += delta
      }
      continue
    }
    if (eventType === 'response.completed') {
      const response = Reflect.get(parsed, 'response')
      if (response && typeof response === 'object') {
        completedResponse = response as Record<string, unknown>
      }
    }
  }
  if (completedResponse) {
    const completedOutputText = getOutputTextFromResponse(completedResponse)
    if (completedOutputText && !Reflect.has(completedResponse, 'output_text')) {
      return {
        ...completedResponse,
        output_text: completedOutputText,
      }
    }
    return completedResponse
  }
  if (accumulatedText) {
    return createMockOpenAiResponse(body, accumulatedText)
  }
  return undefined
}

export const createMockOpenAiResponse = (body: unknown, text: string): ParsedMockOpenAiResponse => {
  if (isSseMockResponse(text)) {
    const parsedSseResponse = parseSseMockResponse(body, text)
    if (parsedSseResponse) {
      return parsedSseResponse
    }
  }
  const model = getModel(body)
  const resolvedText = text === lastRequestSummaryToken ? getLastRequestSummary(body) : text
  return {
    created_at: 0,
    id: 'resp_mock_0001',
    model,
    object: 'response',
    output: [
      {
        content: [
          {
            annotations: [],
            text: resolvedText,
            type: 'output_text',
          },
        ],
        id: 'msg_mock_0001',
        role: 'assistant',
        status: 'completed',
        type: 'message',
      },
    ],
    output_text: resolvedText,
    parallel_tool_calls: true,
    status: 'completed',
    tools: [],
  }
}
