/* eslint-disable prefer-destructuring */
import type { AiLoopOptions } from '../AiLoopOptions/AiLoopOptions.ts'
import type { AiLoopResult } from '../AiLoopResult/AiLoopResult.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import { aiLoopIteration } from '../AiLoopIteration/AiLoopIteration.ts'

export const aiLoop = async (loopOptions: AiLoopOptions): Promise<AiLoopResult> => {
  const { systemPrompt, url } = loopOptions
  let toolCalls: readonly ToolCall<unknown>[] = []

  do {
    const result = await aiLoopIteration({
      headers: loopOptions.headers,
      modelId: loopOptions.modelId,
      systemPrompt,
      toolCalls,
      url,
    })

    if (result.type === 'error') {
      return {
        error: result.error,
        type: 'error',
      }
    }
    toolCalls = result.toolCalls
  } while (toolCalls.length > 0)

  return {
    type: 'success',
  }
}
