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
            text,
            type: 'output_text',
          },
        ],
        id: 'msg_mock_0001',
        role: 'assistant',
        status: 'completed',
        type: 'message',
      },
    ],
    output_text: text,
    parallel_tool_calls: true,
    status: 'completed',
    tools: [],
  }
}