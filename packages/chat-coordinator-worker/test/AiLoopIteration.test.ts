import { afterEach, expect, jest, test } from '@jest/globals'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { aiLoopIteration } from '../src/parts/AiLoopIteration/AiLoopIteration.ts'

afterEach(() => {
  jest.restoreAllMocks()
})

test('ai loop iteration stores response headers with the response body', async () => {
  const appendEventMockRpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendEvent': async () => undefined,
  })
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_123'],
    ]),
    json: async () => ({
      id: 'resp_1',
      status: 'completed',
    }),
  } as any)

  const result = await aiLoopIteration({
    headers: {},
    modelId: 'gpt-5-mini',
    systemPrompt: 'You are a helpful assistant.',
    toolCalls: [],
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    data: {
      id: 'resp_1',
      status: 'completed',
    },
    toolCalls: [],
    type: 'success',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"}],"model":"gpt-5-mini"}',
    headers: {},
    method: 'POST',
  })
  expect(appendEventMockRpc.invocations).toEqual([
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

  appendEventMockRpc[Symbol.dispose]()
})
