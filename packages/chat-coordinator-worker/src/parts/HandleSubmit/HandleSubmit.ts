import type { SubmitOptions } from '../SubmitOptions/SubmitOptions.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { getTimeStamp } from '../GetTimeStamp/GetTimeStamp.ts'
import { addPendingSessionWork, processQueue } from '../ProcessQueue/ProcessQueue.ts'

export const handleSubmit = async (options: SubmitOptions): Promise<void> => {
  const { modelId, openAiKey, requestId, sessionId, systemPrompt, text } = options

  await appendChatEvent({
    requestId,
    sessionId,
    timestamp: getTimeStamp(),
    type: ChatEventType.HandleSubmit,
    value: text,
  })

  addPendingSessionWork({
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    modelId,
    providerId: 'openai',
    sessionId,
    systemPrompt,
    text,
    turnId: requestId,
    url: 'https://api.openai.com/v1/responses',
  })
  await processQueue(sessionId)
}
