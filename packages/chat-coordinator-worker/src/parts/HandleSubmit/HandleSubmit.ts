import type { SubmitOptions } from '../SubmitOptions/SubmitOptions.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { addPendingSessionWork, processQueue } from '../ProcessQueue/ProcessQueue.ts'

interface BaseSubmitOptions {
  readonly id: string
  readonly modelId: string
  readonly providerId: string
  readonly requestId: string
  readonly role: 'user' | 'assistant'
  readonly sessionId: string
  readonly systemPrompt: string
  readonly text: string
}

interface OpenAiSubmitOptions extends BaseSubmitOptions {
  readonly openAiKey: string
  readonly providerId: 'openai'
  readonly url: 'https://api.openai.com/v1/responses'
}

type SubmitOptions = OpenAiSubmitOptions

export const handleSubmit = async <T extends BaseSubmitOptions>(options: T): Promise<void> => {
  const { id, modelId, requestId, role, sessionId, systemPrompt, text, ...rest } = options
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
    type: ChatEventType.Message,
  })

  addPendingSessionWork({
    modelId,
    sessionId,
    systemPrompt,
    text,
    turnId: requestId,
    ...rest,
  })
  await processQueue(sessionId)
}
