import { afterEach, expect, jest, test } from '@jest/globals'
import * as AiLoopIteration from '../src/parts/AiLoopIteration/AiLoopIteration.ts'
import * as AppendChatEvent from '../src/parts/AppendChatEvent/AppendChatEvent.ts'
import * as GetToolCallResults from '../src/parts/GetToolCallResults/GetToolCallResults.ts'
import * as MakeAiRequest from '../src/parts/MakeAiRequest/MakeAiRequest.ts'

afterEach(() => {
  jest.restoreAllMocks()
})

test('ai loop iteration stores response headers with the response body', async () => {
  const toolCalls = [{ args: { query: 'status' }, id: 'tool_1' }]
  const toolCallResults = [{ type: 'success', value: 'ok' }]
  const appendChatEventSpy = jest.spyOn(AppendChatEvent, 'appendChatEvent').mockResolvedValue()
  const getToolCallResultsSpy = jest.spyOn(GetToolCallResults, 'getToolCallResults').mockResolvedValue(toolCallResults)
  const makeAiRequestSpy = jest.spyOn(MakeAiRequest, 'makeAiRequest').mockResolvedValue({
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

  const result = await AiLoopIteration.aiLoopIteration({
    headers: {},
    modelId: 'gpt-5-mini',
    systemPrompt: 'You are a helpful assistant.',
    toolCalls,
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    data: {
      id: 'resp_1',
      status: 'completed',
    },
    toolCalls,
    type: 'success',
  })
  expect(getToolCallResultsSpy).toHaveBeenCalledTimes(1)
  expect(getToolCallResultsSpy).toHaveBeenCalledWith(toolCalls)
  expect(makeAiRequestSpy).toHaveBeenCalledTimes(1)
  expect(makeAiRequestSpy).toHaveBeenCalledWith({
    headers: {},
    modelId: 'gpt-5-mini',
    systemPrompt: 'You are a helpful assistant.',
    toolCallResults,
    toolCalls,
    url: 'https://api.openai.com/v1/responses',
  })
  expect(appendChatEventSpy).toHaveBeenCalledTimes(1)
  expect(appendChatEventSpy).toHaveBeenCalledWith({
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
})

test('ai loop iteration stores an error event when the ai request fails', async () => {
  const error = new Error('request failed')
  const appendChatEventSpy = jest.spyOn(AppendChatEvent, 'appendChatEvent').mockResolvedValue()
  const getToolCallResultsSpy = jest.spyOn(GetToolCallResults, 'getToolCallResults').mockResolvedValue([])
  const makeAiRequestSpy = jest.spyOn(MakeAiRequest, 'makeAiRequest').mockResolvedValue({
    error,
    type: 'error',
  })

  const result = await AiLoopIteration.aiLoopIteration({
    headers: {},
    modelId: 'gpt-5-mini',
    systemPrompt: 'You are a helpful assistant.',
    toolCalls: [],
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    error,
    type: 'error',
  })
  expect(getToolCallResultsSpy).toHaveBeenCalledTimes(1)
  expect(getToolCallResultsSpy).toHaveBeenCalledWith([])
  expect(makeAiRequestSpy).toHaveBeenCalledTimes(1)
  expect(makeAiRequestSpy).toHaveBeenCalledWith({
    headers: {},
    modelId: 'gpt-5-mini',
    systemPrompt: 'You are a helpful assistant.',
    toolCallResults: [],
    toolCalls: [],
    url: 'https://api.openai.com/v1/responses',
  })
  expect(appendChatEventSpy).toHaveBeenCalledTimes(1)
  expect(appendChatEventSpy).toHaveBeenCalledWith({
    type: 'aiResponseError',
    value: error,
  })
})
