import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import type { SubmitAttachment } from '../SubmitOptions/SubmitOptions.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'

interface TextPart {
  readonly text?: string
  readonly type?: string
}

interface MessagePayload {
  readonly attachments?: readonly SubmitAttachment[]
  readonly content?: readonly TextPart[]
  readonly role?: 'assistant' | 'user'
}

interface RawMessageEvent {
  readonly id: string
  readonly message: MessagePayload
  readonly sessionId: string
  readonly timestamp: string
  readonly type: typeof ChatEventType.Message
}

const isRawMessageEvent = (event: unknown): event is RawMessageEvent => {
  if (!event || typeof event !== 'object') {
    return false
  }
  const value = event as RawMessageEvent
  return (
    value.type === ChatEventType.Message && typeof value.id === 'string' && typeof value.sessionId === 'string' && typeof value.timestamp === 'string'
  )
}

const getMessageText = (message: MessagePayload): string => {
  return (message.content || [])
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text || '')
    .join('')
}

const getMessageTime = (timestamp: string): string => {
  return timestamp.slice(11, 16)
}

export const appendChatEvent = async (event: any): Promise<void> => {
  if (isRawMessageEvent(event)) {
    await ChatStorageWorker.invoke('ChatStorage.appendDebugEvent', event)
    await ChatStorageWorker.appendEvent({
      message: {
        ...(event.message.attachments && event.message.attachments.length > 0
          ? {
              attachments: event.message.attachments,
            }
          : {}),
        id: event.id,
        role: event.message.role || 'assistant',
        text: getMessageText(event.message),
        time: getMessageTime(event.timestamp),
      },
      sessionId: event.sessionId,
      timestamp: event.timestamp,
      type: 'chat-message-added',
    })
    return
  }
  await ChatStorageWorker.appendEvent(event)
}
