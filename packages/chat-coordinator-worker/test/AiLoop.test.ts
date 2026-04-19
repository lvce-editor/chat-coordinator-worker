import { expect, jest, test } from '@jest/globals'
import * as AiLoop from '../src/parts/AiLoop/AiLoop.ts'
import * as AiLoopIteration from '../src/parts/AiLoopIteration/AiLoopIteration.ts'

test('ai loop repeats until there are no tool calls left', async () => {
  const aiLoopIterationSpy = jest.spyOn(AiLoopIteration, 'aiLoopIteration')
  const toolCalls = [{ args: { path: 'example.txt' }, id: 'tool-call-1' }]

  aiLoopIterationSpy.mockResolvedValueOnce({
    data: 'first response',
    toolCalls,
    type: 'success',
  })
  aiLoopIterationSpy.mockResolvedValueOnce({
    data: 'final response',
    toolCalls: [],
    type: 'success',
  })

  const result = await AiLoop.aiLoop({
    headers: {
      Authorization: 'Bearer test-key',
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
  expect(aiLoopIterationSpy).toHaveBeenNthCalledWith(1, {
    headers: {
      Authorization: 'Bearer test-key',
    },
    modelId: 'gpt-4.1-mini',
    systemPrompt: 'You are a helpful assistant.',
    toolCalls: [],
    url: 'https://api.openai.com/v1/responses',
  })
  expect(aiLoopIterationSpy).toHaveBeenNthCalledWith(2, {
    headers: {
      Authorization: 'Bearer test-key',
    },
    modelId: 'gpt-4.1-mini',
    systemPrompt: 'You are a helpful assistant.',
    toolCalls,
    url: 'https://api.openai.com/v1/responses',
  })

  aiLoopIterationSpy.mockRestore()
})

test('ai loop returns the first iteration error', async () => {
  const aiLoopIterationSpy = jest.spyOn(AiLoopIteration, 'aiLoopIteration').mockResolvedValueOnce({
    error: new Error('boom'),
    type: 'error',
  })

  const result = await AiLoop.aiLoop({
    headers: {},
    modelId: 'gpt-4.1-mini',
    providerId: 'openai',
    requestId: 'request-1',
    systemPrompt: 'You are a helpful assistant.',
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    error: new Error('boom'),
    type: 'error',
  })
  expect(aiLoopIterationSpy).toHaveBeenCalledTimes(1)

  aiLoopIterationSpy.mockRestore()
})