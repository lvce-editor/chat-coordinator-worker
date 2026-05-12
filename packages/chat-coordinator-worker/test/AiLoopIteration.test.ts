import { afterEach, expect, jest, test } from '@jest/globals'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { aiLoopIteration } from '../src/parts/AiLoopIteration/AiLoopIteration.ts'

afterEach(() => {
  jest.restoreAllMocks()
})

test('ai loop iteration stores exposed response headers with the response body', async () => {
  const appendEventMockRpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async () => undefined,
    'ChatStorage.appendEvent': async () => undefined,
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        sessionId,
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'handle-submit',
        value: 'Hello world',
      },
    ],
  })
  const realDate = globalThis.Date
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000101')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['cf-ray', '9fabab9edec4c7f0-DUS'],
      ['x-request-id', 'req_123'],
      ['x-ratelimit-limit-requests', '500'],
      ['x-ratelimit-remaining-tokens', '199758'],
    ]),
    json: async () => ({
      id: 'resp_1',
      output_text: 'Hello from assistant',
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  const result = await aiLoopIteration({
    headers: {},
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    toolCallResults: [],
    toolCalls: [],
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    data: {
      id: 'resp_1',
      output_text: 'Hello from assistant',
      status: 'completed',
    },
    toolCallResults: [],
    toolCalls: [],
    type: 'success',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"},{"content":"Hello world","role":"user"}],"model":"gpt-5-mini"}',
    headers: {},
    method: 'POST',
  })
  expect(appendEventMockRpc.invocations).toEqual([
    ['ChatStorage.getEvents', 'session-1'],
    [
      'ChatStorage.appendDebugEvent',
      {
        body: {
          input: [
            {
              content: 'You are a helpful assistant.',
              role: 'system',
            },
            {
              content: 'Hello world',
              role: 'user',
            },
          ],
          model: 'gpt-5-mini',
        },
        headers: {},
        method: 'POST',
        requestId: '00000000-0000-4000-8000-000000000101',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'turn-1',
        type: 'ai-request',
        url: 'https://api.openai.com/v1/responses',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: '00000000-0000-4000-8000-000000000101',
          role: 'assistant',
          text: 'Hello from assistant',
          time: '00:00',
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        headers: {
          'cf-ray': '9fabab9edec4c7f0-DUS',
          'content-type': 'application/json',
          'x-ratelimit-limit-requests': '500',
          'x-ratelimit-remaining-tokens': '199758',
          'x-request-id': 'req_123',
        },
        requestId: '00000000-0000-4000-8000-000000000101',
        sessionId: 'session-1',
        statusCode: 200,
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCalls: [],
        turnId: 'turn-1',
        type: 'ai-response',
        value: {
          id: 'resp_1',
          output_text: 'Hello from assistant',
          status: 'completed',
        },
      },
    ],
  ])

  randomUUIDSpy.mockRestore()
  dateSpy.mockRestore()
})

test.skip('ai loop iteration executes pending tool calls and stores a resumable checkpoint', async () => {
  const appendEventMockRpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async () => undefined,
    'ChatStorage.appendEvent': async () => undefined,
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        sessionId,
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'handle-submit',
        value: 'Hello world',
      },
      {
        headers: {
          'content-type': 'application/json',
        },
        requestId: 'request-0',
        sessionId,
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCalls: [{ args: { query: 'status' }, id: 'tool_1' }],
        turnId: 'turn-1',
        type: 'ai-response',
        value: {
          id: 'resp_0',
          status: 'completed',
        },
      },
    ],
  })
  const realDate = globalThis.Date
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000102')
  const fetchSpy = jest.spyOn(globalThis, 'fetch')

  const result = await aiLoopIteration({
    headers: {},
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    toolCallResults: [],
    toolCalls: [],
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    data: undefined,
    toolCallResults: [
      {
        type: 'success',
        value: {
          query: 'status',
        },
      },
    ],
    toolCalls: [],
    type: 'success',
  })
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(appendEventMockRpc.invocations).toEqual([
    ['ChatStorage.getEvents', 'session-1'],
    [
      'ChatStorage.appendDebugEvent',
      {
        requestId: '00000000-0000-4000-8000-000000000102',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCallResults: [
          {
            type: 'success',
            value: {
              query: 'status',
            },
          },
        ],
        turnId: 'turn-1',
        type: 'tool-calls-finished',
      },
    ],
  ])

  randomUUIDSpy.mockRestore()
  dateSpy.mockRestore()
})

test.skip('ai loop iteration resumes from stored tool call results and makes the next ai request', async () => {
  const appendEventMockRpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async () => undefined,
    'ChatStorage.appendEvent': async () => undefined,
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        sessionId,
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'handle-submit',
        value: 'Hello world',
      },
      {
        requestId: 'request-2',
        sessionId,
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCallResults: [
          {
            type: 'success',
            value: {
              query: 'status',
            },
          },
        ],
        turnId: 'turn-1',
        type: 'tool-calls-finished',
      },
    ],
  })
  const realDate = globalThis.Date
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000103')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_456'],
    ]),
    json: async () => ({
      id: 'resp_2',
      output_text: 'Follow-up answer',
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  const result = await aiLoopIteration({
    headers: {},
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    toolCallResults: [],
    toolCalls: [],
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    data: {
      id: 'resp_2',
      output_text: 'Follow-up answer',
      status: 'completed',
    },
    toolCallResults: [],
    toolCalls: [],
    type: 'success',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(appendEventMockRpc.invocations).toEqual([
    ['ChatStorage.getEvents', 'session-1'],
    [
      'ChatStorage.appendDebugEvent',
      {
        body: {
          input: [
            {
              content: 'You are a helpful assistant.',
              role: 'system',
            },
            {
              content: 'Hello world',
              role: 'user',
            },
          ],
          model: 'gpt-5-mini',
        },
        headers: {},
        method: 'POST',
        requestId: '00000000-0000-4000-8000-000000000103',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'turn-1',
        type: 'ai-request',
        url: 'https://api.openai.com/v1/responses',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        id: '00000000-0000-4000-8000-000000000103',
        message: {
          content: [
            {
              text: 'Follow-up answer',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        requestId: '00000000-0000-4000-8000-000000000103',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: '00000000-0000-4000-8000-000000000103',
          role: 'assistant',
          text: 'Follow-up answer',
          time: '00:00',
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'req_456',
        },
        requestId: '00000000-0000-4000-8000-000000000103',
        sessionId: 'session-1',
        statusCode: 200,
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCalls: [],
        turnId: 'turn-1',
        type: 'ai-response',
        value: {
          id: 'resp_2',
          output_text: 'Follow-up answer',
          status: 'completed',
        },
      },
    ],
  ])

  randomUUIDSpy.mockRestore()
  dateSpy.mockRestore()
})

test.skip('ai loop iteration replays stored assistant messages with assistant role', async () => {
  const appendEventMockRpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async () => undefined,
    'ChatStorage.appendEvent': async () => undefined,
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        id: 'message-1',
        message: {
          content: [
            {
              text: 'Hello world',
              type: 'text',
            },
          ],
          role: 'user',
        },
        requestId: 'request-1',
        sessionId,
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
      {
        id: 'message-2',
        message: {
          content: [
            {
              text: 'Hi there',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        requestId: 'request-2',
        sessionId,
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
      {
        id: 'message-3',
        message: {
          content: [
            {
              text: 'Follow up question',
              type: 'text',
            },
          ],
          role: 'user',
        },
        requestId: 'request-3',
        sessionId,
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
  })
  const realDate = globalThis.Date
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000105')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_789'],
    ]),
    json: async () => ({
      id: 'resp_3',
      output_text: 'Another answer',
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  await aiLoopIteration({
    headers: {},
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Ignored fallback text',
    toolCallResults: [],
    toolCalls: [],
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"},{"content":"Hello world","role":"user"},{"content":"Hi there","role":"assistant"},{"content":"Follow up question","role":"user"}],"model":"gpt-5-mini"}',
    headers: {},
    method: 'POST',
  })
  expect(appendEventMockRpc.invocations).toEqual([
    ['ChatStorage.getEvents', 'session-1'],
    [
      'ChatStorage.appendDebugEvent',
      {
        body: {
          input: [
            {
              content: 'You are a helpful assistant.',
              role: 'system',
            },
            {
              content: 'Hello world',
              role: 'user',
            },
            {
              content: 'Hi there',
              role: 'assistant',
            },
            {
              content: 'Follow up question',
              role: 'user',
            },
          ],
          model: 'gpt-5-mini',
        },
        headers: {},
        method: 'POST',
        requestId: '00000000-0000-4000-8000-000000000105',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'turn-1',
        type: 'ai-request',
        url: 'https://api.openai.com/v1/responses',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        id: '00000000-0000-4000-8000-000000000105',
        message: {
          content: [
            {
              text: 'Another answer',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        requestId: '00000000-0000-4000-8000-000000000105',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: '00000000-0000-4000-8000-000000000105',
          role: 'assistant',
          text: 'Another answer',
          time: '00:00',
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'req_789',
        },
        requestId: '00000000-0000-4000-8000-000000000105',
        sessionId: 'session-1',
        statusCode: 200,
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCalls: [],
        turnId: 'turn-1',
        type: 'ai-response',
        value: {
          id: 'resp_3',
          output_text: 'Another answer',
          status: 'completed',
        },
      },
    ],
  ])

  randomUUIDSpy.mockRestore()
  dateSpy.mockRestore()
})

test.skip('ai loop iteration stores status code for non-2xx ai responses', async () => {
  const appendEventMockRpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async () => undefined,
    'ChatStorage.appendEvent': async () => undefined,
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        sessionId,
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'handle-submit',
        value: 'Hello world',
      },
    ],
  })
  const realDate = globalThis.Date
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000104')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_429'],
    ]),
    json: async () => ({
      error: {
        message: 'rate limited',
      },
    }),
    ok: false,
    status: 429,
  } as any)

  const result = await aiLoopIteration({
    headers: {},
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    toolCallResults: [],
    toolCalls: [],
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    error: {
      error: {
        message: 'rate limited',
      },
    },
    type: 'error',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(appendEventMockRpc.invocations).toEqual([
    ['ChatStorage.getEvents', 'session-1'],
    [
      'ChatStorage.appendDebugEvent',
      {
        body: {
          input: [
            {
              content: 'You are a helpful assistant.',
              role: 'system',
            },
            {
              content: 'Hello world',
              role: 'user',
            },
          ],
          model: 'gpt-5-mini',
        },
        headers: {},
        method: 'POST',
        requestId: '00000000-0000-4000-8000-000000000104',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'turn-1',
        type: 'ai-request',
        url: 'https://api.openai.com/v1/responses',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        id: '00000000-0000-4000-8000-000000000104',
        message: {
          content: [
            {
              text: 'The AI request was rate limited. Please try again.',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        requestId: '00000000-0000-4000-8000-000000000104',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: '00000000-0000-4000-8000-000000000104',
          role: 'assistant',
          text: 'The AI request was rate limited. Please try again.',
          time: '00:00',
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        requestId: '00000000-0000-4000-8000-000000000104',
        sessionId: 'session-1',
        statusCode: 429,
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'turn-1',
        type: 'ai-response',
        value: {
          error: {
            message: 'rate limited',
          },
        },
      },
    ],
  ])

  randomUUIDSpy.mockRestore()
  dateSpy.mockRestore()
})

test.skip('ai loop iteration appends a visible assistant message when the ai request throws', async () => {
  const appendEventMockRpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async () => undefined,
    'ChatStorage.appendEvent': async () => undefined,
    'ChatStorage.getEvents': async (sessionId: string) => [
      {
        sessionId,
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'handle-submit',
        value: 'Hello world',
      },
    ],
  })
  const realDate = globalThis.Date
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000105')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('request failed'))

  const result = await aiLoopIteration({
    headers: {},
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    toolCallResults: [],
    toolCalls: [],
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    error: new Error('request failed'),
    type: 'error',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(appendEventMockRpc.invocations).toEqual([
    ['ChatStorage.getEvents', 'session-1'],
    [
      'ChatStorage.appendDebugEvent',
      {
        body: {
          input: [
            {
              content: 'You are a helpful assistant.',
              role: 'system',
            },
            {
              content: 'Hello world',
              role: 'user',
            },
          ],
          model: 'gpt-5-mini',
        },
        headers: {},
        method: 'POST',
        requestId: '00000000-0000-4000-8000-000000000105',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'turn-1',
        type: 'ai-request',
        url: 'https://api.openai.com/v1/responses',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        id: '00000000-0000-4000-8000-000000000105',
        message: {
          content: [
            {
              text: 'The AI request failed. Please try again.',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        requestId: '00000000-0000-4000-8000-000000000105',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: '00000000-0000-4000-8000-000000000105',
          role: 'assistant',
          text: 'The AI request failed. Please try again.',
          time: '00:00',
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        requestId: '00000000-0000-4000-8000-000000000105',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'turn-1',
        type: 'ai-response',
        value: new Error('request failed'),
      },
    ],
  ])

  randomUUIDSpy.mockRestore()
  dateSpy.mockRestore()
})
