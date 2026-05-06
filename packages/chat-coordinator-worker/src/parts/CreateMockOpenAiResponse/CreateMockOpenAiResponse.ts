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

export const createMockOpenAiResponse = (body: unknown, text: string): MockOpenAiResponse => {
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
