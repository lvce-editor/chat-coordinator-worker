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
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z') as any)
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
    modelId: 'gpt-4.1-mini',
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
      'ChatStorage.appendEvent',
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
        turnId: 'request-1',
        type: 'ai-response-success',
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
