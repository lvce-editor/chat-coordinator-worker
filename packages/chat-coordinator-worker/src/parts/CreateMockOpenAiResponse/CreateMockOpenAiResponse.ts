// cspell:ignore logprobs

interface MockOpenAiResponseContentItem {
  readonly annotations: readonly []
  readonly logprobs: readonly []
  readonly text: string
  readonly type: 'output_text'
}

interface MockOpenAiResponseOutputItem {
  readonly content: readonly [MockOpenAiResponseContentItem]
  readonly id: string
  readonly role: 'assistant'
  readonly status: 'completed'
  readonly type: 'message'
}

interface MockOpenAiResponseUsage {
  readonly input_tokens: number
  readonly input_tokens_details: {
    readonly cached_tokens: 0
  }
  readonly output_tokens: number
  readonly output_tokens_details: {
    readonly reasoning_tokens: 0
  }
  readonly total_tokens: number
}

interface MockOpenAiResponse {
  readonly background: false
  readonly billing: {
    readonly payer: 'openai'
  }
  readonly completed_at: number
  readonly created_at: number
  readonly error: null
  readonly frequency_penalty: 0
  readonly id: string
  readonly incomplete_details: null
  readonly instructions: null
  readonly max_output_tokens: null
  readonly max_tool_calls: null
  readonly metadata: Record<string, never>
  readonly model: string
  readonly moderation: null
  readonly object: 'response'
  readonly output: readonly [MockOpenAiResponseOutputItem]
  readonly parallel_tool_calls: true
  readonly presence_penalty: 0
  readonly previous_response_id: null
  readonly prompt_cache_key: null
  readonly prompt_cache_retention: 'in_memory'
  readonly reasoning: {
    readonly effort: null
    readonly summary: null
  }
  readonly safety_identifier: null
  readonly service_tier: 'default'
  readonly status: 'completed'
  readonly store: true
  readonly temperature: 1
  readonly text: {
    readonly format: {
      readonly type: 'text'
    }
    readonly verbosity: 'medium'
  }
  readonly tool_choice: 'auto'
  readonly tools: readonly []
  readonly top_logprobs: 0
  readonly top_p: 1
  readonly truncation: 'disabled'
  readonly usage: MockOpenAiResponseUsage
  readonly user: null
}

type ParsedMockOpenAiResponse = MockOpenAiResponse | Record<string, unknown>

const lastRequestSummaryToken = '__MOCK_OPENAPI_LAST_REQUEST_SUMMARY__'
const mockCreatedAtBase = 1_778_610_258

const getHashRound = (value: string): string => {
  let hash = 2_166_136_261
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16_777_619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const getDeterministicHex = (seed: string, length: number): string => {
  let result = ''
  let index = 0
  while (result.length < length) {
    result += getHashRound(`${seed}:${index}`)
    index++
  }
  return result.slice(0, length)
}

const getInputTexts = (body: unknown): readonly string[] => {
  if (!body || typeof body !== 'object') {
    return []
  }
  const input = Reflect.get(body, 'input')
  if (!Array.isArray(input)) {
    return []
  }
  const parts: string[] = []
  for (const item of input) {
    if (typeof item === 'string') {
      parts.push(item)
      continue
    }
    if (!item || typeof item !== 'object') {
      continue
    }
    const content = Reflect.get(item, 'content')
    if (typeof content === 'string') {
      parts.push(content)
      continue
    }
    if (!Array.isArray(content)) {
      continue
    }
    for (const contentPart of content) {
      if (typeof contentPart === 'string') {
        parts.push(contentPart)
        continue
      }
      if (!contentPart || typeof contentPart !== 'object') {
        continue
      }
      const text = Reflect.get(contentPart, 'text')
      if (typeof text !== 'string' || !text) {
        continue
      }
      const type = Reflect.get(contentPart, 'type')
      if (type === undefined || type === 'input_text') {
        parts.push(text)
      }
    }
  }
  return parts
}

const estimateTokens = (text: string): number => {
  const trimmedText = text.trim()
  if (!trimmedText) {
    return 0
  }
  return Math.max(1, Math.ceil(trimmedText.length / 5))
}

const getUsage = (body: unknown, outputText: string): MockOpenAiResponseUsage => {
  const inputText = getInputTexts(body).join('\n')
  const inputTokens = estimateTokens(inputText)
  const outputTokens = estimateTokens(outputText)
  return {
    input_tokens: inputTokens,
    input_tokens_details: {
      cached_tokens: 0,
    },
    output_tokens: outputTokens,
    output_tokens_details: {
      reasoning_tokens: 0,
    },
    total_tokens: inputTokens + outputTokens,
  }
}

const getResponseSeed = (body: unknown, text: string): string => {
  const serializedBody = body === undefined ? 'undefined' : JSON.stringify(body)
  return `${serializedBody}:${text}`
}

const getResponseId = (seed: string): string => {
  const responseSeed = `response:${seed}`
  return `resp_${getDeterministicHex(responseSeed, 32)}`
}

const getMessageId = (seed: string): string => {
  const messageSeed = `message:${seed}`
  return `msg_${getDeterministicHex(messageSeed, 32)}`
}

const getCreatedAt = (seed: string): number => {
  const suffix = Number.parseInt(getDeterministicHex(`created:${seed}`, 6), 16)
  return mockCreatedAtBase + (suffix % 1000)
}

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
  const seed = getResponseSeed(body, resolvedText)
  const createdAt = getCreatedAt(seed)
  return {
    background: false,
    billing: {
      payer: 'openai',
    },
    completed_at: createdAt + 2,
    created_at: createdAt,
    error: null,
    frequency_penalty: 0,
    id: getResponseId(seed),
    incomplete_details: null,
    instructions: null,
    max_output_tokens: null,
    max_tool_calls: null,
    metadata: {},
    model,
    moderation: null,
    object: 'response',
    output: [
      {
        content: [
          {
            annotations: [],
            logprobs: [],
            text: resolvedText,
            type: 'output_text',
          },
        ],
        id: getMessageId(seed),
        role: 'assistant',
        status: 'completed',
        type: 'message',
      },
    ],
    parallel_tool_calls: true,
    presence_penalty: 0,
    previous_response_id: null,
    prompt_cache_key: null,
    prompt_cache_retention: 'in_memory',
    reasoning: {
      effort: null,
      summary: null,
    },
    safety_identifier: null,
    service_tier: 'default',
    status: 'completed',
    store: true,
    temperature: 1,
    text: {
      format: {
        type: 'text',
      },
      verbosity: 'medium',
    },
    tool_choice: 'auto',
    tools: [],
    top_logprobs: 0,
    top_p: 1,
    truncation: 'disabled',
    usage: getUsage(body, resolvedText),
    user: null,
  }
}
