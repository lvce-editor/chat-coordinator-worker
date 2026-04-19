import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { getTimeStamp } from '../GetTimeStamp/GetTimeStamp.ts'

export interface SubmitOptions {
  readonly attachments: readonly any[]
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly sessionId: string
  readonly text: string
}

export const handleSubmit = async (options: SubmitOptions): Promise<void> => {
  const { sessionId, text } = options

  await appendChatEvent({
    sessionId,
    timestamp: getTimeStamp(),
    type: ChatEventType.HandleSubmit,
    value: text,
  })
}
