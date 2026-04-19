/* eslint-disable prefer-destructuring */
import type { AiLoopOptions } from '../AiLoopOptions/AiLoopOptions.ts'
import type { AiLoopResult } from '../AiLoopResult/AiLoopResult.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import { makeAiRequest } from '../MakeAiRequest/MakeAiRequest.ts'

export const aiLoop = async (loopOptions: AiLoopOptions): Promise<AiLoopResult> => {
  const { systemPrompt, url } = loopOptions
  let toolCalls: readonly ToolCall<unknown>[] = []

  do {
    const result = await makeAiRequest({
      systemPrompt,
      toolCalls,
      url,
    })

    if (result.type === 'error') {
      await appendChatEvent({
        type: 'aiResponseError',
        value: result.error,
      })
      return {
        error: result.error,
        type: 'error',
      }
    } else {
      await appendChatEvent({
        toolCalls: result.toolCalls,
        type: 'aiResponseSuccess',
        value: result.data,
      })
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
