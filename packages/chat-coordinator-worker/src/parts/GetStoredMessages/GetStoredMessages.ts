import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'

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
    readonly content?: readonly StoredMessageContentPart[]
  }
  readonly type: typeof ChatEventType.Message
}

interface LegacyHandleSubmitEvent {
  readonly type: 'handle-submit'
  readonly value: string
}

interface StoredAiResponseSuccessEvent {
  readonly toolCalls?: readonly ToolCall<unknown>[]
  readonly type: typeof ChatEventType.AiResponseSuccess
}

type StoredEvent =
  | Awaited<ReturnType<typeof ChatStorageWorker.getEvents>>[number]
  | LegacyHandleSubmitEvent
  | StoredAiResponseSuccessEvent
  | StoredMessageEvent
  | ToolCallsFinishedEvent

interface StoredAiLoopState {
  readonly messages: readonly string[]
  readonly toolCallResults: readonly ToolCallResult[]
  readonly toolCalls: readonly ToolCall<unknown>[]
}

const isHandleSubmitEvent = (event: StoredEvent): event is LegacyHandleSubmitEvent | StoredMessageEvent => {
  return event.type === ChatEventType.Message || event.type === 'handle-submit'
}

const getStoredMessageText = (event: LegacyHandleSubmitEvent | StoredMessageEvent): string | undefined => {
  if ('value' in event && typeof event.value === 'string') {
    return event.value
  }
  if (!('message' in event)) {
    return undefined
  }
  const { content = [] } = event.message
  const text = content
    .filter((part: StoredMessageContentPart) => part.type === 'text' && typeof part.text === 'string')
    .map((part: StoredMessageContentPart) => part.text)
    .join('')
  return text || undefined
}

const isAiResponseSuccessEvent = (event: StoredEvent): event is StoredAiResponseSuccessEvent => {
  return event.type === ChatEventType.AiResponseSuccess
}

const isToolCallsFinishedEvent = (event: StoredEvent): event is ToolCallsFinishedEvent => {
  return event.type === ChatEventType.ToolCallsFinished
}

export const getStoredMessages = async (sessionId: string, fallbackText: string): Promise<readonly string[]> => {
  const state = await getStoredAiLoopState(sessionId, fallbackText, [], [])
  return state.messages
}

export const getStoredAiLoopState = async (
  sessionId: string,
  fallbackText: string,
  fallbackToolCalls: readonly ToolCall<unknown>[],
  fallbackToolCallResults: readonly ToolCallResult[],
): Promise<StoredAiLoopState> => {
  const events = await ChatStorageWorker.getEvents(sessionId)
  const messages: string[] = []
  let toolCalls = fallbackToolCalls
  let toolCallResults = fallbackToolCallResults

  for (const event of events as readonly StoredEvent[]) {
    if (isHandleSubmitEvent(event)) {
      const text = getStoredMessageText(event)
      if (text) {
        messages.push(text)
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
    messages.push(fallbackText)
  }

  return {
    messages,
    toolCallResults,
    toolCalls,
  }
}
