import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import type { SubmitAttachment } from '../SubmitOptions/SubmitOptions.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'

interface TextPart {
  readonly arguments?: string
  readonly call_id?: string
  readonly name?: string
  readonly text?: string
  readonly type?: string
}

interface StoredToolCall {
  readonly arguments: string
  readonly id: string
  readonly name: string
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

const getMessageContent = (message: MessagePayload): readonly TextPart[] => {
  return (message.content || []).filter((part) => {
    if ((part.type === 'text' || part.type === 'input_text') && typeof part.text === 'string') {
      return true
    }
    return part.type === 'function_call' && typeof part.arguments === 'string' && typeof part.call_id === 'string' && typeof part.name === 'string'
  })
}

const getMessageText = (message: MessagePayload): string => {
  return (message.content || [])
    .filter((part) => (part.type === 'text' || part.type === 'input_text') && typeof part.text === 'string')
    .map((part) => part.text || '')
    .join('')
}

const getMessageToolCalls = (message: MessagePayload): readonly StoredToolCall[] => {
  return (message.content || [])
    .filter(
      (part): part is TextPart & { readonly arguments: string; readonly call_id: string; readonly name: string; readonly type: 'function_call' } =>
        part.type === 'function_call' && typeof part.arguments === 'string' && typeof part.call_id === 'string' && typeof part.name === 'string',
    )
    .map((part) => ({
      arguments: part.arguments,
      id: part.call_id,
      name: part.name,
    }))
}

export const appendChatEvent = async (event: any): Promise<void> => {
  if (isRawMessageEvent(event)) {
    const content = getMessageContent(event.message)
    const text = getMessageText(event.message)
    const toolCalls = getMessageToolCalls(event.message)
    await ChatStorageWorker.invoke('ChatStorage.appendEvent', {
      message: {
        ...(event.message.attachments && event.message.attachments.length > 0
          ? {
              attachments: event.message.attachments,
            }
          : {}),
        ...(content.length > 0
          ? {
              content,
            }
          : {}),
        ...(text
          ? {
              text,
            }
          : {}),
        ...(toolCalls.length > 0
          ? {
              time: event.timestamp,
              toolCalls,
            }
          : {}),
        id: event.id,
        role: event.message.role || 'assistant',
      },
      sessionId: event.sessionId,
      timestamp: event.timestamp,
      type: 'chat-message-added',
    })
    return
  }
  await ChatStorageWorker.appendEvent(event)
}
