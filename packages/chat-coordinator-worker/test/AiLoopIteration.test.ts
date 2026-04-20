import { afterEach, expect, jest, test } from '@jest/globals'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { aiLoopIteration } from '../src/parts/AiLoopIteration/AiLoopIteration.ts'

afterEach(() => {
  jest.restoreAllMocks()
})

test('ai loop iteration stores response headers with the response body', async () => {
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
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z') as any)
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000101')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_123'],
    ]),
    json: async () => ({
      id: 'resp_1',
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  const result = await aiLoopIteration({
    headers: {},
    modelId: 'gpt-5-mini',
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
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'req_123',
        },
        requestId: '00000000-0000-4000-8000-000000000101',
        sessionId: 'session-1',
        statusCode: 200,
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCalls: [],
        turnId: 'turn-1',
        type: 'ai-response-success',
        value: {
          id: 'resp_1',
          status: 'completed',
        },
      },
    ],
  ])

  randomUUIDSpy.mockRestore()
  dateSpy.mockRestore()
})

test('ai loop iteration executes pending tool calls and stores a resumable checkpoint', async () => {
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
        type: 'ai-response-success',
        value: {
          id: 'resp_0',
          status: 'completed',
        },
      },
    ],
  })
  const realDate = globalThis.Date
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z') as any)
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000102')
  const fetchSpy = jest.spyOn(globalThis, 'fetch')

  const result = await aiLoopIteration({
    headers: {},
    modelId: 'gpt-5-mini',
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

test('ai loop iteration resumes from stored tool call results and makes the next ai request', async () => {
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
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z') as any)
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000103')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_456'],
    ]),
    json: async () => ({
      id: 'resp_2',
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  const result = await aiLoopIteration({
    headers: {},
    modelId: 'gpt-5-mini',
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
        type: 'ai-response-success',
        value: {
          id: 'resp_2',
          status: 'completed',
        },
      },
    ],
  ])

  randomUUIDSpy.mockRestore()
  dateSpy.mockRestore()
})

test('ai loop iteration stores status code for non-2xx ai responses', async () => {
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
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z') as any)
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
        type: 'ai-response-error',
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
