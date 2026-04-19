import { expect, jest, test } from '@jest/globals'

const appendEvent = jest.fn()

await jest.unstable_mockModule('@lvce-editor/rpc-registry', () => ({
  ChatStorageWorker: {
    appendEvent,
  },
}))

const { ChatStorageWorker } = await import('@lvce-editor/rpc-registry')
const { aiLoopIteration } = await import('../src/parts/AiLoopIteration/AiLoopIteration.ts')

test('ai loop iteration stores response headers with the response body', async () => {
  appendEvent.mockResolvedValue(undefined)
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
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"}],"model":"gpt-5-mini"}',
    headers: {},
    method: 'POST',
  })
  expect(ChatStorageWorker.appendEvent).toHaveBeenCalledTimes(1)
  expect(appendEvent).toHaveBeenCalledWith({
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
  fetchSpy.mockRestore()
})
