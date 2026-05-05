import { expect, jest, test } from '@jest/globals'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { handleSubmit } from '../src/parts/HandleSubmit/HandleSubmit.ts'

test('handle submit stores the openai response headers', async () => {
  const events: any[] = []
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  appendEvent.mockImplementation(async (event: unknown) => {
    events.push(event)
  })
  const rpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async (_event: unknown) => undefined,
    'ChatStorage.appendEvent': appendEvent,
    'ChatStorage.getEvents': async () => events,
  })
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000')
  const realDate = globalThis.Date
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
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

  await handleSubmit({
    attachments: [],
    id: 'request-1',
    modelId: 'openapi/gpt-4.1-mini',
    openAiKey: 'test-key',
    requestId: 'request-1',
    role: 'user',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
  })

  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"},{"content":"Hello world","role":"user"}],"model":"gpt-4.1-mini"}',
    headers: {
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
  expect(rpc.invocations).toEqual([
    [
      'ChatStorage.appendDebugEvent',
      {
        id: 'request-1',
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
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: 'request-1',
          role: 'user',
          text: 'Hello world',
          time: '00:00',
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
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
        turnId: 'request-1',
        type: 'ai-request',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
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
      'ChatStorage.appendEvent',
      {
        message: {
          id: '00000000-0000-4000-8000-000000000000',
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
          'content-type': 'application/json',
          'x-request-id': 'req_123',
        },
        requestId: '00000000-0000-4000-8000-000000000000',
        sessionId: 'session-1',
        statusCode: 200,
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCalls: [],
        turnId: 'request-1',
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
  fetchSpy.mockRestore()
})

test('handle submit should append a missing key message instead of calling openai when the api key is empty', async () => {
  const events: any[] = []
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  appendEvent.mockImplementation(async (event: unknown) => {
    events.push(event)
  })
  const rpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async (_event: unknown) => undefined,
    'ChatStorage.appendEvent': appendEvent,
    'ChatStorage.getEvents': async () => events,
  })
  const realDate = globalThis.Date
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
  const fetchSpy = jest.spyOn(globalThis, 'fetch')

  await expect(
    handleSubmit({
      attachments: [],
      id: 'request-1',
      modelId: 'openapi/gpt-4.1-mini',
      openAiKey: '',
      requestId: 'request-1',
      role: 'user',
      sessionId: 'session-1',
      systemPrompt: 'You are a helpful assistant.',
      text: 'Hello world',
    }),
  ).resolves.toBeUndefined()

  expect(fetchSpy).not.toHaveBeenCalled()
  expect(rpc.invocations).toEqual([
    [
      'ChatStorage.appendDebugEvent',
      {
        id: 'request-1',
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
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: 'request-1',
          role: 'user',
          text: 'Hello world',
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
        id: 'request-1',
        message: {
          content: [
            {
              text: 'OpenAI API key is not configured. Enter your OpenAI API key below and click Save.',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        requestId: 'request-1',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: 'request-1',
          role: 'assistant',
          text: 'OpenAI API key is not configured. Enter your OpenAI API key below and click Save.',
          time: '00:00',
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
  ])

  dateSpy.mockRestore()
  fetchSpy.mockRestore()
})

test('handle submit should resolve after handled openai http errors', async () => {
  const events: any[] = []
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  appendEvent.mockImplementation(async (event: unknown) => {
    events.push(event)
  })
  const rpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async (_event: unknown) => undefined,
    'ChatStorage.appendEvent': appendEvent,
    'ChatStorage.getEvents': async () => events,
  })
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000111')
  const realDate = globalThis.Date
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_401'],
    ]),
    json: async () => ({
      error: {
        code: 'invalid_api_key',
        message: 'Incorrect API key provided.',
        type: 'invalid_request_error',
      },
    }),
    ok: false,
    status: 401,
  } as any)

  await expect(
    handleSubmit({
      attachments: [],
      id: 'request-1',
      modelId: 'openapi/gpt-4.1-mini',
      openAiKey: 'bad-key',
      requestId: 'request-1',
      role: 'user',
      sessionId: 'session-1',
      systemPrompt: 'You are a helpful assistant.',
      text: 'Hello world',
    }),
  ).resolves.toBeUndefined()

  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(rpc.invocations).toEqual([
    [
      'ChatStorage.appendDebugEvent',
      {
        id: 'request-1',
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
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: 'request-1',
          role: 'user',
          text: 'Hello world',
          time: '00:00',
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
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
        requestId: '00000000-0000-4000-8000-000000000111',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'request-1',
        type: 'ai-request',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        id: '00000000-0000-4000-8000-000000000111',
        message: {
          content: [
            {
              text: 'The AI request was rejected. Check the API key and try again.',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        requestId: '00000000-0000-4000-8000-000000000111',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: '00000000-0000-4000-8000-000000000111',
          role: 'assistant',
          text: 'The AI request was rejected. Check the API key and try again.',
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
        requestId: '00000000-0000-4000-8000-000000000111',
        sessionId: 'session-1',
        statusCode: 401,
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'request-1',
        type: 'ai-response',
        value: {
          error: {
            code: 'invalid_api_key',
            message: 'Incorrect API key provided.',
            type: 'invalid_request_error',
          },
        },
      },
    ],
  ])

  randomUUIDSpy.mockRestore()
  dateSpy.mockRestore()
  fetchSpy.mockRestore()
})
