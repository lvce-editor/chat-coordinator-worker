import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import type { AiRequestMessageInput, AiRequestPart } from '../GetAiRequestBody/GetAiRequestBody.ts'
import type { SubmitAttachment } from '../SubmitOptions/SubmitOptions.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { getAttachmentParts } from '../GetAttachmentParts/GetAttachmentParts.ts'

interface ToolCallsFinishedEvent {
  readonly sessionId: string
  readonly timestamp: string
  readonly toolCallResults: readonly ToolCallResult[]
  readonly type: typeof ChatEventType.ToolCallsFinished
}

interface StoredMessageContentPart {
  readonly text?: string
  readonly type?: string
}

interface StoredMessageEvent {
  readonly message: {
    readonly attachments?: readonly SubmitAttachment[]
    readonly content?: readonly StoredMessageContentPart[]
    readonly role?: 'assistant' | 'user'
  }
  readonly type: typeof ChatEventType.Message
}

interface LegacyHandleSubmitEvent {
  readonly type: 'handle-submit'
  readonly value: string
}

interface StoredAiResponseSuccessEvent {
  readonly toolCalls?: readonly ToolCall<unknown>[]
  readonly type: typeof ChatEventType.AiResponse
}

type StoredEvent =
  | Awaited<ReturnType<typeof ChatStorageWorker.getEvents>>[number]
  | LegacyHandleSubmitEvent
  | StoredAiResponseSuccessEvent
  | StoredMessageEvent
  | ToolCallsFinishedEvent

interface StoredAiLoopState {
  readonly messages: readonly AiRequestMessageInput[]
  readonly toolCallResults: readonly ToolCallResult[]
  readonly toolCalls: readonly ToolCall<unknown>[]
}

const isHandleSubmitEvent = (event: StoredEvent): event is LegacyHandleSubmitEvent | StoredMessageEvent => {
  return event.type === ChatEventType.Message || event.type === 'handle-submit'
}

const getStoredMessage = (event: LegacyHandleSubmitEvent | StoredMessageEvent): AiRequestMessageInput | undefined => {
  if ('value' in event && typeof event.value === 'string') {
    return {
      content: event.value,
      role: 'user',
    }
  }
  if (!('message' in event)) {
    return undefined
  }
  const { attachments = [], content = [], role } = event.message
  if (role !== 'assistant' && role !== 'user') {
    return undefined
  }
  const text = content
    .filter((part: StoredMessageContentPart) => part.type === 'text' && typeof part.text === 'string')
    .map((part: StoredMessageContentPart) => part.text)
    .join('')
  if (attachments.length === 0) {
    if (!text) {
      return undefined
    }
    return {
      content: text,
      role,
    }
  }
  const parts: AiRequestPart[] = []
  if (text) {
    parts.push({
      text,
      type: 'input_text',
    })
  }
  parts.push(...getAttachmentParts(attachments))
  if (parts.length === 0) {
    return undefined
  }
  return {
    content: parts,
    role,
  }
}

const isAiResponseSuccessEvent = (event: StoredEvent): event is StoredAiResponseSuccessEvent => {
  return event.type === ChatEventType.AiResponse
}

const isToolCallsFinishedEvent = (event: StoredEvent): event is ToolCallsFinishedEvent => {
  return event.type === ChatEventType.ToolCallsFinished
}

export const getStoredMessages = async (sessionId: string, fallbackText: string): Promise<readonly AiRequestMessageInput[]> => {
  const state = await getStoredAiLoopState(sessionId, fallbackText, [], [])
  return state.messages
}

export const getStoredAiLoopState = async (
  sessionId: string,
  fallbackText: string | readonly AiRequestMessageInput[],
  fallbackToolCalls: readonly ToolCall<unknown>[],
  fallbackToolCallResults: readonly ToolCallResult[],
): Promise<StoredAiLoopState> => {
  const events = await ChatStorageWorker.getEvents(sessionId)
  const messages: AiRequestMessageInput[] = []
  let toolCalls = fallbackToolCalls
  let toolCallResults = fallbackToolCallResults

  for (const event of events as readonly StoredEvent[]) {
    if (isHandleSubmitEvent(event)) {
      const message = getStoredMessage(event)
      if (message) {
        messages.push(message)
      }
      continue
    }
    if (isAiResponseSuccessEvent(event)) {
      toolCalls = event.toolCalls || []
      toolCallResults = []
      continue
    }
    if (isToolCallsFinishedEvent(event)) {
      const { toolCallResults: eventToolCallResults } = event
      toolCalls = []
      toolCallResults = eventToolCallResults
    }
  }

  if (messages.length === 0) {
    if (typeof fallbackText === 'string') {
      messages.push({
        content: fallbackText,
        role: 'user',
      })
    } else {
      messages.push(...fallbackText)
    }
  }

  return {
    messages,
    toolCallResults,
    toolCalls,
  }
}
