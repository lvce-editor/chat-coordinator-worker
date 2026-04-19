import { expect, jest, test } from '@jest/globals'

const appendEvent = jest.fn()
const getTimeStamp = jest.fn()

await jest.unstable_mockModule('@lvce-editor/rpc-registry', () => ({
  ChatStorageWorker: {
    appendEvent,
  },
}))

await jest.unstable_mockModule('../src/parts/GetTimeStamp/GetTimeStamp.ts', () => ({
  getTimeStamp,
}))

const { ChatStorageWorker } = await import('@lvce-editor/rpc-registry')
const { getTimeStamp: getTimeStampMock } = await import('../src/parts/GetTimeStamp/GetTimeStamp.ts')
const { handleSubmit } = await import('../src/parts/HandleSubmit/HandleSubmit.ts')

test('handle submit stores the openai response headers', async () => {
  appendEvent.mockResolvedValue(undefined)
  getTimeStamp.mockReturnValue('2026-04-19T00:00:00.000Z')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_123'],
    ]),
    json: jest.fn().mockResolvedValue({
      id: 'resp_1',
      status: 'completed',
    }),
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
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"}],"model":"gpt-4.1-mini"}',
    headers: {
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
  expect(ChatStorageWorker.appendEvent).toHaveBeenCalledTimes(2)
  expect(appendEvent).toHaveBeenNthCalledWith(1, {
    requestId: 'request-1',
    sessionId: 'session-1',
    timestamp: '2026-04-19T00:00:00.000Z',
    type: 'handle-submit',
    value: 'Hello world',
  })
  expect(appendEvent).toHaveBeenNthCalledWith(2, {
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'req_123',
    },
    toolCalls: [],
    type: 'aiResponseSuccess',
    value: {
      id: 'resp_1',
      status: 'completed',
    },
  })

  appendEvent.mockReset()
  getTimeStampMock.mockReset()
  fetchSpy.mockRestore()
})
