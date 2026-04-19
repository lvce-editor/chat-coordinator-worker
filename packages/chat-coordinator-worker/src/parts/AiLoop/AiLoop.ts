/* eslint-disable prefer-destructuring */
import type { AiLoopOptions } from '../AiLoopOptions/AiLoopOptions.ts'
import type { AiLoopResult } from '../AiLoopResult/AiLoopResult.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import { makeAiRequest } from '../MakeAiRequest/MakeAiRequest.ts'

export const aiLoop = async (loopOptions: AiLoopOptions): Promise<AiLoopResult> => {
  const { systemPrompt, url } = loopOptions
  // TODO
  let toolCalls: readonly ToolCall<any>[] = []

  do {
    const result = await makeAiRequest({
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
    if (result.toolCalls.length === 0) {
      return {
        type: 'success',
      }
    }
    toolCalls = result.toolCalls
  } while (toolCalls.length > 0)

  return {
    type: 'success',
  }
}
