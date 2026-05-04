import type { AiLoopIterationOptions } from '../AiLoopIterationOptions/AiLoopIterationOptions.ts'
import type { AiLoopIterationResult } from '../AiLoopIterationResult/AiLoopIterationResult.ts'
import { aiLoopIterationAiRequest } from '../AiLoopIterationAiRequest/AiLoopIterationAiRequest.ts'
import { aiLoopIterationToolCall } from '../AiLoopIterationToolCall/AiLoopIterationToolCall.ts'
import { getRequestId } from '../GetRequestId/GetRequestId.ts'
import { getStoredAiLoopState } from '../GetStoredMessages/GetStoredMessages.ts'
import { getTimeStamp } from '../GetTimeStamp/GetTimeStamp.ts'

export const aiLoopIteration = async (loopOptions: AiLoopIterationOptions): Promise<AiLoopIterationResult> => {
  const {
    headers,
    modelId,
    sessionId,
    systemPrompt,
    text,
    toolCallResults: fallbackToolCallResults,
    toolCalls: fallbackToolCalls,
    turnId,
    url,
  } = loopOptions
  const requestId = getRequestId()
  const timestamp = getTimeStamp()
  const storedState = await getStoredAiLoopState(sessionId, text, fallbackToolCalls, fallbackToolCallResults)
  const { messages, toolCallResults, toolCalls } = storedState

  if (toolCallResults.length === 0 && toolCalls.length > 0) {
    return aiLoopIterationToolCall({
      requestId,
      sessionId,
      timestamp,
      toolCalls,
      turnId,
    })
  }

  return aiLoopIterationAiRequest({
    headers,
    messages,
    modelId,
    requestId,
    sessionId,
    systemPrompt,
    timestamp,
    toolCallResults,
    toolCalls,
    turnId,
    url,
  })
}
