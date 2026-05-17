import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import type { AiLoopIterationOptions } from '../AiLoopIterationOptions/AiLoopIterationOptions.ts'
import type { AiLoopIterationResult } from '../AiLoopIterationResult/AiLoopIterationResult.ts'
import { appendChatDebugEvent } from '../AppendChatDebugEvent/AppendChatDebugEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { getToolCallResults } from '../GetToolCallResults/GetToolCallResults.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

interface AiLoopIterationToolCallOptions {
  readonly requestId: string
  readonly sessionId: string
  readonly timestamp: string
  readonly toolCalls: AiLoopIterationOptions['toolCalls']
  readonly turnId: string
}

interface StoredToolCall {
  readonly arguments: string
  readonly errorMessage?: string
  readonly id?: string
  readonly name: string
  readonly result?: string
  readonly status?: 'error' | 'not-found' | 'success'
}

interface StoredChatMessageEvent {
  readonly message?: {
    readonly id?: string
    readonly text?: string
    readonly time?: string
    readonly toolCalls?: readonly StoredToolCall[]
  }
  readonly type?: string
}

const serializeToolCallValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  const serialized = JSON.stringify(value)
  return typeof serialized === 'string' ? serialized : 'null'
}

const getStoredMessageEvent = async (sessionId: string, requestId: string): Promise<StoredChatMessageEvent | undefined> => {
  const events = await ChatStorageWorker.invoke('ChatStorage.getMessages', sessionId)
  return (events as readonly StoredChatMessageEvent[]).find((event) => event.type === 'chat-message-added' && event.message?.id === requestId)
}

const getUpdatedToolCalls = (
  storedToolCalls: readonly StoredToolCall[],
  toolCallResults: readonly ToolCallResult[],
): readonly StoredToolCall[] => {
  const toolCallResultsById = new Map(toolCallResults.map((toolCallResult) => [toolCallResult.callId, toolCallResult]))
  return storedToolCalls.map((storedToolCall) => {
    if (!storedToolCall.id) {
      return storedToolCall
    }
    const toolCallResult = toolCallResultsById.get(storedToolCall.id)
    if (!toolCallResult) {
      return storedToolCall
    }
    if (toolCallResult.type === 'success') {
      return {
        ...storedToolCall,
        result: serializeToolCallValue(toolCallResult.value),
        status: 'success',
      }
    }
    return {
      ...storedToolCall,
      errorMessage: serializeToolCallValue({ error: toolCallResult.error }),
      status: 'error',
    }
  })
}

const appendStoredToolCallResults = async (
  requestId: string,
  sessionId: string,
  timestamp: string,
  toolCallResults: readonly ToolCallResult[],
): Promise<void> => {
  const storedMessageEvent = await getStoredMessageEvent(sessionId, requestId)
  const storedToolCalls = storedMessageEvent?.message?.toolCalls || []
  if (storedToolCalls.length === 0) {
    return
  }
  await ChatStorageWorker.invoke('ChatStorage.appendEvent', {
    inProgress: false,
    messageId: requestId,
    sessionId,
    text: storedMessageEvent?.message?.text || '',
    time: storedMessageEvent?.message?.time || timestamp,
    timestamp,
    toolCalls: getUpdatedToolCalls(storedToolCalls, toolCallResults),
    type: 'chat-message-updated',
  })
}

export const aiLoopIterationToolCall = async (options: AiLoopIterationToolCallOptions): Promise<AiLoopIterationResult> => {
  const { requestId, sessionId, timestamp, toolCalls, turnId } = options
  const resolvedToolCallResults = await getToolCallResults(toolCalls)
  await appendStoredToolCallResults(requestId, sessionId, timestamp, resolvedToolCallResults)
  await appendChatDebugEvent({
    requestId,
    sessionId,
    timestamp,
    toolCallResults: resolvedToolCallResults,
    turnId,
    type: ChatEventType.ToolCallsFinished,
  })
  return {
    data: undefined,
    toolCallResults: resolvedToolCallResults,
    toolCalls: [],
    type: 'success',
  }
}
