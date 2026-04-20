import type { ChatMessage, ChatToolCall } from '../ChatViewModel/ChatViewModel.ts'

interface EventBase {
  readonly sessionId: string
  readonly timestamp: string
  readonly type: string
}

interface ChatMessageAddedEvent extends EventBase {
  readonly message: ChatMessage
  readonly type: 'chat-message-added'
}

interface ChatMessageUpdatedEvent extends EventBase {
  readonly inProgress?: boolean
  readonly messageId: string
  readonly text: string
  readonly time: string
  readonly toolCalls?: readonly ChatToolCall[]
  readonly type: 'chat-message-updated'
}

interface ChatSessionMessagesReplacedEvent extends EventBase {
  readonly messages: readonly ChatMessage[]
  readonly type: 'chat-session-messages-replaced'
}

interface HandleSubmitEvent extends EventBase {
  readonly requestId?: string
  readonly type: 'handle-submit'
  readonly value: string
}

interface AiResponseSuccessEvent extends EventBase {
  readonly requestId?: string
  readonly toolCalls?: readonly ChatToolCall[]
  readonly turnId?: string
  readonly type: 'ai-response-success'
  readonly value: unknown
}

interface StoredMessageContentPart {
  readonly text?: string
  readonly type?: string
}

interface StoredMessageEvent extends EventBase {
  readonly id?: string
  readonly message: {
    readonly content?: readonly StoredMessageContentPart[]
    readonly role?: 'assistant' | 'user'
  }
  readonly requestId?: string
  readonly type: 'message'
}

type StoredEvent =
  | AiResponseSuccessEvent
  | ChatMessageAddedEvent
  | ChatMessageUpdatedEvent
  | ChatSessionMessagesReplacedEvent
  | HandleSubmitEvent
  | StoredMessageEvent
  | EventBase

const getResponseOutputText = (parsed: unknown): string => {
  if (!parsed || typeof parsed !== 'object') {
    return ''
  }

  const outputText = Reflect.get(parsed, 'output_text')
  if (typeof outputText === 'string') {
    return outputText
  }

  const output = Reflect.get(parsed, 'output')
  if (!Array.isArray(output)) {
    return ''
  }

  const chunks: string[] = []
  for (const outputItem of output) {
    if (!outputItem || typeof outputItem !== 'object') {
      continue
    }
    if (Reflect.get(outputItem, 'type') !== 'message') {
      continue
    }
    const content = Reflect.get(outputItem, 'content')
    if (!Array.isArray(content)) {
      continue
    }
    for (const part of content) {
      if (!part || typeof part !== 'object') {
        continue
      }
      const partType = Reflect.get(part, 'type')
      const text = Reflect.get(part, 'text')
      if ((partType === 'output_text' || partType === 'text') && typeof text === 'string') {
        chunks.push(text)
      }
    }
  }
  return chunks.join('')
}

const getResponseToolCalls = (parsed: unknown): readonly ChatToolCall[] | undefined => {
  if (!parsed || typeof parsed !== 'object') {
    return undefined
  }
  const output = Reflect.get(parsed, 'output')
  if (!Array.isArray(output)) {
    return undefined
  }
  const toolCalls: ChatToolCall[] = []
  for (const outputItem of output) {
    if (!outputItem || typeof outputItem !== 'object') {
      continue
    }
    if (Reflect.get(outputItem, 'type') !== 'function_call') {
      continue
    }
    const name = Reflect.get(outputItem, 'name')
    if (typeof name !== 'string' || !name) {
      continue
    }
    const callId = Reflect.get(outputItem, 'call_id')
    const rawArguments = Reflect.get(outputItem, 'arguments')
    toolCalls.push({
      arguments: typeof rawArguments === 'string' ? rawArguments : '',
      ...(typeof callId === 'string' && callId
        ? {
            id: callId,
          }
        : {}),
      name,
      status: 'success',
    })
  }
  return toolCalls.length === 0 ? undefined : toolCalls
}

const getStoredMessageText = (event: StoredMessageEvent): string => {
  const { content = [] } = event.message
  return content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text || '')
    .join('')
}

const getEventMessageId = (
  event: AiResponseSuccessEvent | HandleSubmitEvent | StoredMessageEvent,
  fallbackPrefix: string,
  fallbackIndex: number,
): string => {
  if ('requestId' in event && typeof event.requestId === 'string' && event.requestId) {
    return event.requestId
  }
  if ('turnId' in event && typeof event.turnId === 'string' && event.turnId) {
    return event.turnId
  }
  if ('id' in event && typeof event.id === 'string' && event.id) {
    return event.id
  }
  if (event.type === 'ai-response-success' && event.value && typeof event.value === 'object') {
    const responseId = Reflect.get(event.value, 'id')
    if (typeof responseId === 'string' && responseId) {
      return responseId
    }
  }
  return `${fallbackPrefix}-${fallbackIndex}`
}

export const toFinalMessages = (events: readonly unknown[]): readonly ChatMessage[] => {
  const byId = new Map<string, ChatMessage>()
  let order: string[] = []
  let syntheticUserIndex = 0
  let syntheticAssistantIndex = 0
  for (const rawEvent of events) {
    const event = rawEvent as StoredEvent
    if (event.type === 'chat-session-messages-replaced') {
      byId.clear()
      order = []
      for (const message of event.messages) {
        byId.set(message.id, message)
        order.push(message.id)
      }
      continue
    }
    if (event.type === 'chat-message-added') {
      byId.set(event.message.id, event.message)
      order.push(event.message.id)
      continue
    }
    if (event.type === 'chat-message-updated') {
      const message = byId.get(event.messageId)
      if (!message) {
        continue
      }
      byId.set(event.messageId, {
        ...message,
        ...(event.inProgress === undefined
          ? {}
          : {
              inProgress: event.inProgress,
            }),
        text: event.text,
        time: event.time,
        ...(event.toolCalls === undefined
          ? {}
          : {
              toolCalls: event.toolCalls,
            }),
      })
      continue
    }
    if (event.type === 'handle-submit') {
      const id = getEventMessageId(event, 'user-message', syntheticUserIndex)
      syntheticUserIndex += 1
      const message: ChatMessage = {
        id,
        role: 'user',
        text: event.value,
        time: event.timestamp,
      }
      byId.set(id, message)
      order.push(id)
      continue
    }
    if (event.type === 'message') {
      if (event.message.role !== 'assistant' && event.message.role !== 'user') {
        continue
      }
      const id = getEventMessageId(event, `${event.message.role}-message`, event.message.role === 'user' ? syntheticUserIndex : syntheticAssistantIndex)
      if (event.message.role === 'user') {
        syntheticUserIndex += 1
      } else {
        syntheticAssistantIndex += 1
      }
      const message: ChatMessage = {
        id,
        role: event.message.role,
        text: getStoredMessageText(event),
        time: event.timestamp,
      }
      byId.set(id, message)
      order.push(id)
      continue
    }
    if (event.type === 'ai-response-success') {
      const id = getEventMessageId(event, 'assistant-message', syntheticAssistantIndex)
      syntheticAssistantIndex += 1
      const responseToolCalls = getResponseToolCalls(event.value)
      const message: ChatMessage = {
        id,
        role: 'assistant',
        text: getResponseOutputText(event.value),
        time: event.timestamp,
        ...(event.toolCalls
          ? {
              toolCalls: event.toolCalls,
            }
          : responseToolCalls
            ? {
                toolCalls: responseToolCalls,
              }
            : {}),
      }
      byId.set(id, message)
      order.push(id)
    }
  }
  return order.map((id) => byId.get(id)).filter((message): message is ChatMessage => !!message)
}
