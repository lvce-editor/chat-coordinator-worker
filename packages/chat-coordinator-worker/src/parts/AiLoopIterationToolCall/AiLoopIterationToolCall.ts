import type { AiLoopIterationOptions } from '../AiLoopIterationOptions/AiLoopIterationOptions.ts'
import type { AiLoopIterationResult } from '../AiLoopIterationResult/AiLoopIterationResult.ts'
import { appendChatDebugEvent } from '../AppendChatDebugEvent/AppendChatDebugEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { getToolCallResults } from '../GetToolCallResults/GetToolCallResults.ts'

interface AiLoopIterationToolCallOptions {
  readonly requestId: string
  readonly sessionId: string
  readonly timestamp: string
  readonly toolCalls: AiLoopIterationOptions['toolCalls']
  readonly turnId: string
}

export const aiLoopIterationToolCall = async (options: AiLoopIterationToolCallOptions): Promise<AiLoopIterationResult> => {
  const { requestId, sessionId, timestamp, toolCalls, turnId } = options
  const resolvedToolCallResults = await getToolCallResults(toolCalls)
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
