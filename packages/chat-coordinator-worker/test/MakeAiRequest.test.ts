import { afterEach, expect, jest, test } from '@jest/globals'
import { makeAiRequest } from '../src/parts/MakeAiRequest/MakeAiRequest.ts'

afterEach(() => {
  jest.restoreAllMocks()
})

test('make ai request forwards the system prompt and returns response data', async () => {
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

  const result = await makeAiRequest({
    headers: {
      Authorization: 'Bearer test-key',
    },
    modelId: 'gpt-5-mini',
    systemPrompt: 'You are a helpful assistant.',
    toolCallResults: [],
    toolCalls: [],
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    data: {
      id: 'resp_1',
      status: 'completed',
    },
    headers: {
      'content-type': 'application/json',
      'x-request-id': 'req_123',
    },
    toolCalls: [],
    type: 'success',
  })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"}],"model":"gpt-5-mini"}',
    headers: {
      Authorization: 'Bearer test-key',
    },
    method: 'POST',
  })
})

test('make ai request propagates network failures', async () => {
  const error = new Error('request failed')
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(error)

  await expect(
    makeAiRequest({
      headers: {},
      modelId: 'gpt-5-mini',
      systemPrompt: 'You are a helpful assistant.',
      toolCallResults: [],
      toolCalls: [],
      url: 'https://api.openai.com/v1/responses',
    }),
  ).rejects.toThrow(error)
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/responses', {
    body: '{"input":[{"content":"You are a helpful assistant.","role":"system"}],"model":"gpt-5-mini"}',
    headers: {},
    method: 'POST',
  })
})
