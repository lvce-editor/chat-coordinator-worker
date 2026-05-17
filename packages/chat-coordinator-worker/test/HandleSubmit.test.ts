import { afterEach, expect, jest, test } from '@jest/globals'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { handleSubmit } from '../src/parts/HandleSubmit/HandleSubmit.ts'
import { resetProcessQueue } from '../src/parts/ProcessQueue/ProcessQueue.ts'

const imageAttachment = {
  attachmentId: 'attachment-1',
  displayType: 'image',
  mimeType: 'image/svg+xml',
  name: 'photo.svg',
  previewSrc: 'data:image/svg+xml;base64,PHN2Zw==',
  size: 67,
} as const

const textFileAttachment = {
  attachmentId: 'attachment-2',
  displayType: 'text-file',
  mimeType: 'text/plain',
  name: 'notes.txt',
  size: 20,
  textContent: 'hello from text file',
} as const

afterEach(() => {
  jest.restoreAllMocks()
  resetProcessQueue()
})

test.skip('handle submit stores the openai response headers', async () => {
  const events: any[] = []
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  appendEvent.mockImplementation(async (event: unknown) => {
    events.push(event)
  })
  const rpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async (_event: unknown) => undefined,
    'ChatStorage.appendEvent': appendEvent,
    'ChatStorage.getMessages': async () => events,
  })
  jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000')
  const realDate = globalThis.Date
  jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
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
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"},{"content":[{"text":"Hello world","type":"input_text"}],"role":"user"}],"model":"gpt-4.1-mini"}',
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
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
    ['ChatStorage.getMessages', 'session-1'],
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
              content: [
                {
                  text: 'Hello world',
                  type: 'input_text',
                },
              ],
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
        url: 'https://api.openai.com/v1/responses',
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
        size: 0,
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
})

test.skip('handle submit should append a missing key message instead of calling openai when the api key is empty', async () => {
  const events: any[] = []
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  appendEvent.mockImplementation(async (event: unknown) => {
    events.push(event)
  })
  const rpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async (_event: unknown) => undefined,
    'ChatStorage.appendEvent': appendEvent,
    'ChatStorage.getMessages': async () => events,
  })
  const realDate = globalThis.Date
  jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
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
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
  ])
})

test.skip('handle submit should persist attachments and send attachment-aware request input', async () => {
  const events: any[] = []
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  appendEvent.mockImplementation(async (event: unknown) => {
    events.push(event)
  })
  const rpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async (_event: unknown) => undefined,
    'ChatStorage.appendEvent': appendEvent,
    'ChatStorage.getMessages': async () => events,
  })
  jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000123')
  const realDate = globalThis.Date
  jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_attachments'],
    ]),
    json: async () => ({
      id: 'resp_attachments',
      output_text: 'Hello from assistant',
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  await handleSubmit({
    attachments: [imageAttachment, textFileAttachment],
    id: 'request-attachments',
    modelId: 'openapi/gpt-4.1-mini',
    openAiKey: 'test-key',
    requestId: 'request-attachments',
    role: 'user',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Please review the attachments',
  })

  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: JSON.stringify({
      input: [
        {
          content: 'You are a helpful assistant.',
          role: 'system',
        },
        {
          content: [
            {
              text: 'Please review the attachments',
              type: 'input_text',
            },
            {
              image_url: imageAttachment.previewSrc,
              type: 'input_image',
            },
            {
              text: 'Attached text file "notes.txt" (text/plain):\n\nhello from text file',
              type: 'input_text',
            },
          ],
          role: 'user',
        },
      ],
      model: 'gpt-4.1-mini',
    }),
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
        id: 'request-attachments',
        message: {
          attachments: [imageAttachment, textFileAttachment],
          content: [
            {
              text: 'Please review the attachments',
              type: 'text',
            },
          ],
          role: 'user',
        },
        requestId: 'request-attachments',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          attachments: [imageAttachment, textFileAttachment],
          id: 'request-attachments',
          role: 'user',
          text: 'Please review the attachments',
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
    ['ChatStorage.getMessages', 'session-1'],
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
              content: [
                {
                  text: 'Please review the attachments',
                  type: 'input_text',
                },
                {
                  image_url: imageAttachment.previewSrc,
                  type: 'input_image',
                },
                {
                  text: 'Attached text file "notes.txt" (text/plain):\n\nhello from text file',
                  type: 'input_text',
                },
              ],
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
        requestId: '00000000-0000-4000-8000-000000000123',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'request-attachments',
        type: 'ai-request',
        url: 'https://api.openai.com/v1/responses',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        id: '00000000-0000-4000-8000-000000000123',
        message: {
          content: [
            {
              text: 'Hello from assistant',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        requestId: '00000000-0000-4000-8000-000000000123',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: '00000000-0000-4000-8000-000000000123',
          role: 'assistant',
          text: 'Hello from assistant',
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
          'x-request-id': 'req_attachments',
        },
        requestId: '00000000-0000-4000-8000-000000000123',
        sessionId: 'session-1',
        size: 0,
        statusCode: 200,
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCalls: [],
        turnId: 'request-attachments',
        type: 'ai-response',
        value: {
          id: 'resp_attachments',
          output_text: 'Hello from assistant',
          status: 'completed',
        },
      },
    ],
  ])
})

test.skip('handle submit should resolve after handled openai http errors', async () => {
  const events: any[] = []
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  appendEvent.mockImplementation(async (event: unknown) => {
    events.push(event)
  })
  const rpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async (_event: unknown) => undefined,
    'ChatStorage.appendEvent': appendEvent,
    'ChatStorage.getMessages': async () => events,
  })
  jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000111')
  const realDate = globalThis.Date
  jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
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
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
    ['ChatStorage.getMessages', 'session-1'],
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
              content: [
                {
                  text: 'Hello world',
                  type: 'input_text',
                },
              ],
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
        url: 'https://api.openai.com/v1/responses',
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
        size: 0,
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
})

test.skip('handle submit should use backend requests when own backend is enabled', async () => {
  const events: any[] = []
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  appendEvent.mockImplementation(async (event: unknown) => {
    events.push(event)
  })
  const rpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendDebugEvent': async (_event: unknown) => undefined,
    'ChatStorage.appendEvent': appendEvent,
    'ChatStorage.getMessages': async () => events,
  })
  jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000112')
  const realDate = globalThis.Date
  jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z'))
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers(),
    json: async () => ({
      id: 'resp_invalid',
      output: [],
      status: 'completed',
    }),
    ok: true,
    status: 200,
  } as any)

  await expect(
    handleSubmit({
      attachments: [],
      authAccessToken: 'backend-token',
      backendUrl: 'https://backend.example.com',
      id: 'request-1',
      modelId: 'openapi/gpt-4.1-mini',
      openAiKey: '',
      requestId: 'request-1',
      role: 'user',
      sessionId: 'session-1',
      systemPrompt: 'You are a helpful assistant.',
      text: 'Hello world',
      useOwnBackend: true,
    }),
  ).resolves.toBeUndefined()

  expect(fetchSpy).toHaveBeenCalledWith('https://backend.example.com/v1/responses', {
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"},{"content":[{"text":"Hello world","type":"input_text"}],"role":"user"}],"model":"gpt-4.1-mini"}',
    headers: {
      Authorization: 'Bearer backend-token',
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
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
    ['ChatStorage.getMessages', 'session-1'],
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
              content: [
                {
                  text: 'Hello world',
                  type: 'input_text',
                },
              ],
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
        requestId: '00000000-0000-4000-8000-000000000112',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'request-1',
        type: 'ai-request',
        url: 'https://backend.example.com/v1/responses',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        id: '00000000-0000-4000-8000-000000000112',
        message: {
          content: [
            {
              text: 'Backend completion request failed. Unexpected backend response format: no assistant text or tool calls were returned.',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        requestId: '00000000-0000-4000-8000-000000000112',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'message',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        message: {
          id: '00000000-0000-4000-8000-000000000112',
          role: 'assistant',
          text: 'Backend completion request failed. Unexpected backend response format: no assistant text or tool calls were returned.',
        },
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'chat-message-added',
      },
    ],
    [
      'ChatStorage.appendDebugEvent',
      {
        headers: {},
        requestId: '00000000-0000-4000-8000-000000000112',
        sessionId: 'session-1',
        size: 0,
        statusCode: 200,
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCalls: [],
        turnId: 'request-1',
        type: 'ai-response',
        value: {
          id: 'resp_invalid',
          output: [],
          status: 'completed',
        },
      },
    ],
  ])
})
