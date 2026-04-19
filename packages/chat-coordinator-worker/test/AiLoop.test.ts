import { afterEach, expect, jest, test } from '@jest/globals'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { aiLoop } from '../src/parts/AiLoop/AiLoop.ts'

afterEach(async () => {
  jest.restoreAllMocks()
})

test('ai loop returns success and appends the ai response event', async () => {
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  const mockRpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendEvent': appendEvent,
  })
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_123'],
    ]),
    json: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      id: 'resp_1',
      status: 'completed',
    }),
  } as any)

  const result = await aiLoop({
    headers: {
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    },
    modelId: 'gpt-4.1-mini',
    providerId: 'openai',
    requestId: 'request-1',
    systemPrompt: 'You are a helpful assistant.',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    type: 'success',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"}],"model":"gpt-4.1-mini"}',
    headers: {
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
  expect(mockRpc.invocations).toEqual([
    [
      'ChatStorage.appendEvent',
      {
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
      },
    ],
  ])
})

test('ai loop propagates request failures', async () => {
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  const mockRpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendEvent': appendEvent,
  })
  const error = new Error('request failed')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(error)

  await expect(
    aiLoop({
      headers: {},
      modelId: 'gpt-4.1-mini',
      providerId: 'openai',
      requestId: 'request-1',
      systemPrompt: 'You are a helpful assistant.',
      url: 'https://api.openai.com/v1/responses',
    }),
  ).rejects.toThrow(error)

  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(mockRpc.invocations).toEqual([])
})
