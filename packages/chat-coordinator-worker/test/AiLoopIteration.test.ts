import { expect, jest, test } from '@jest/globals'
import * as AiLoopIteration from '../src/parts/AiLoopIteration/AiLoopIteration.ts'
import * as AppendChatEvent from '../src/parts/AppendChatEvent/AppendChatEvent.ts'
import * as MakeAiRequest from '../src/parts/MakeAiRequest/MakeAiRequest.ts'

test('ai loop iteration stores response headers with the response body', async () => {
  const appendChatEventSpy = jest.spyOn(AppendChatEvent, 'appendChatEvent').mockResolvedValue()
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
  expect(makeAiRequestSpy).toHaveBeenCalledTimes(1)

  appendChatEventSpy.mockRestore()
  makeAiRequestSpy.mockRestore()
})
