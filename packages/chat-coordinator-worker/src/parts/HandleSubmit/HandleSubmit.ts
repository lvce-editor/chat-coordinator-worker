import type { SubmitOptions } from '../SubmitOptions/SubmitOptions.ts'
import { aiLoop } from '../AiLoop/AiLoop.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { getTimeStamp } from '../GetTimeStamp/GetTimeStamp.ts'

export const handleSubmit = async (options: SubmitOptions): Promise<void> => {
  const { modelId, openAiKey, requestId, sessionId, systemPrompt, text } = options

  await appendChatEvent({
    requestId,
    sessionId,
    timestamp: getTimeStamp(),
    type: ChatEventType.HandleSubmit,
    value: text,
  })

  await aiLoop({
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    modelId,
    providerId: 'openai',
    requestId,
    systemPrompt,
    url: 'https://api.openai.com/v1/chat/completions',
  })
}
