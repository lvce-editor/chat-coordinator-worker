import { expect, jest, test } from '@jest/globals'
import * as AiLoop from '../src/parts/AiLoop/AiLoop.ts'
import * as AppendChatEvent from '../src/parts/AppendChatEvent/AppendChatEvent.ts'
import * as HandleSubmit from '../src/parts/HandleSubmit/HandleSubmit.ts'
import * as GetTimeStamp from '../src/parts/GetTimeStamp/GetTimeStamp.ts'

test('handle submit uses the openai responses endpoint', async () => {
  const appendChatEventSpy = jest.spyOn(AppendChatEvent, 'appendChatEvent').mockResolvedValue()
  const aiLoopSpy = jest.spyOn(AiLoop, 'aiLoop').mockResolvedValue({ type: 'success' })
  const getTimeStampSpy = jest.spyOn(GetTimeStamp, 'getTimeStamp').mockReturnValue('2026-04-19T00:00:00.000Z')

  await HandleSubmit.handleSubmit({
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

  expect(appendChatEventSpy).toHaveBeenCalledTimes(1)
  expect(getTimeStampSpy).toHaveBeenCalledTimes(1)
  expect(aiLoopSpy).toHaveBeenCalledWith({
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

  appendChatEventSpy.mockRestore()
  aiLoopSpy.mockRestore()
  getTimeStampSpy.mockRestore()
})