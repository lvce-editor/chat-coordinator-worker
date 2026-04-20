import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

interface ToolCallsFinishedEvent {
  readonly sessionId: string
  readonly timestamp: string
  readonly toolCallResults: readonly ToolCallResult[]
  readonly type: typeof ChatEventType.ToolCallsFinished
}

type StoredEvent = Awaited<ReturnType<typeof ChatStorageWorker.getEvents>>[number] | ToolCallsFinishedEvent

interface StoredAiLoopState {
  readonly messages: readonly string[]
  readonly toolCalls: readonly ToolCall<unknown>[]
  readonly toolCallResults: readonly ToolCallResult[]
}

const isHandleSubmitEvent = (event: StoredEvent): event is StoredEvent & { readonly value: string } => {
  return event.type === ChatEventType.HandleSubmit
}

const isAiResponseSuccessEvent = (event: StoredEvent): event is StoredEvent & { readonly toolCalls?: readonly ToolCall<unknown>[] } => {
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
      messages.push(event.value)
      continue
    }
    if (isAiResponseSuccessEvent(event)) {
      toolCalls = event.toolCalls || []
      toolCallResults = []
      continue
    }
    if (isToolCallsFinishedEvent(event)) {
      toolCalls = []
      toolCallResults = event.toolCallResults
    }
  }

  if (messages.length === 0) {
    messages.push(fallbackText)
  }

  return {
    messages,
    toolCalls,
    toolCallResults,
  }
}
