/* eslint-disable prefer-destructuring */
import type { AiLoopOptions } from '../AiLoopOptions/AiLoopOptions.ts'
import type { AiLoopResult } from '../AiLoopResult/AiLoopResult.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'
import { aiLoopIteration } from '../AiLoopIteration/AiLoopIteration.ts'

export const aiLoop = async (loopOptions: AiLoopOptions): Promise<AiLoopResult> => {
  const { headers, modelId, sessionId, systemPrompt, text, turnId, url } = loopOptions
  let toolCalls: readonly ToolCall<unknown>[] = []
  let toolCallResults: readonly ToolCallResult[] = []

  do {
    const result = await aiLoopIteration({
      headers,
      modelId,
      sessionId,
      systemPrompt,
      text,
      toolCallResults,
      toolCalls,
      turnId,
      url,
    })

    if (result.type === 'error') {
      return {
        error: result.error,
        type: 'error',
      }
    }
    if (result.toolCallResults.length > 0) {
      return {
        type: 'reschedule',
      }
    }
    toolCalls = result.toolCalls
    toolCallResults = result.toolCallResults
  } while (toolCalls.length > 0)

  return {
    type: 'success',
  }
}
