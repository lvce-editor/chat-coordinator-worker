import type { SubmitOptions } from '../SubmitOptions/SubmitOptions.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { addPendingSessionWork, processQueue } from '../ProcessQueue/ProcessQueue.ts'

export const handleSubmit = async (options: SubmitOptions): Promise<void> => {
  const { id, modelId, openAiKey, requestId, role, sessionId, systemPrompt, text } = options
  const date = new Date()
  const timestamp = date.toISOString()

  await appendChatEvent({
    id,
    message: {
      content: [
        {
          text,
          type: 'text',
        },
      ],
      role,
    },
    requestId,
    sessionId,
    timestamp,
    type: ChatEventType.HandleSubmit,
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
