import { afterEach, expect, jest, test } from '@jest/globals'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { aiLoop } from '../src/parts/AiLoop/AiLoop.ts'

afterEach(() => {
  jest.restoreAllMocks()
})

test('ai loop returns success and appends the ai response event', async () => {
  const rpc = ChatStorageWorker.registerMockRpc({
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
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_123'],
    ]),
    json: async () => ({
      id: 'resp_1',
      output_text: 'Hello from assistant',
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  const result = await aiLoop({
    headers: {
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    },
    modelId: 'gpt-4.1-mini',
    providerId: 'openai',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    type: 'success',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(rpc.invocations).toEqual([
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
          model: 'gpt-4.1-mini',
        },
        headers: {
          Authorization: 'Bearer [redacted]',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        requestId: '00000000-0000-4000-8000-000000000000',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'turn-1',
        type: 'ai-request',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        id: '00000000-0000-4000-8000-000000000000',
        message: {
          content: [
            {
              text: 'Hello from assistant',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        requestId: '00000000-0000-4000-8000-000000000000',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'req_123',
        },
        requestId: '00000000-0000-4000-8000-000000000000',
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

test('ai loop returns reschedule after executing tool calls', async () => {
  const rpc = ChatStorageWorker.registerMockRpc({
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
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z') as any)
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
  const fetchSpy = jest.spyOn(globalThis, 'fetch')

  const result = await aiLoop({
    headers: {},
    modelId: 'gpt-4.1-mini',
    providerId: 'openai',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    type: 'reschedule',
  })
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(rpc.invocations).toEqual([
    ['ChatStorage.getEvents', 'session-1'],
    [
      'ChatStorage.appendDebugEvent',
      {
        requestId: '00000000-0000-4000-8000-000000000001',
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

test('ai loop returns reschedule when ai response contains tool calls', async () => {
  const rpc = ChatStorageWorker.registerMockRpc({
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
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000002')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_124'],
    ]),
    json: async () => ({
      id: 'resp_2',
      output: [
        {
          arguments: '{"query":"status"}',
          call_id: 'tool_1',
          type: 'function_call',
        },
      ],
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  const result = await aiLoop({
    headers: {},
    modelId: 'gpt-4.1-mini',
    providerId: 'openai',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    type: 'reschedule',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(rpc.invocations).toEqual([
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
          model: 'gpt-4.1-mini',
        },
        headers: {},
        method: 'POST',
        requestId: '00000000-0000-4000-8000-000000000002',
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
          'x-request-id': 'req_124',
        },
        requestId: '00000000-0000-4000-8000-000000000002',
        sessionId: 'session-1',
        statusCode: 200,
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCalls: [
          {
            args: {
              query: 'status',
            },
            id: 'tool_1',
          },
        ],
        turnId: 'turn-1',
        type: 'ai-response',
        value: {
          id: 'resp_2',
          output: [
            {
              arguments: '{"query":"status"}',
              call_id: 'tool_1',
              type: 'function_call',
            },
          ],
          status: 'completed',
        },
      },
    ],
    ['ChatStorage.getEvents', 'session-1'],
    [
      'ChatStorage.appendDebugEvent',
      {
        requestId: '00000000-0000-4000-8000-000000000002',
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
