import type { ToolCall } from '../ToolCall/ToolCall.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import { getToolCallResults } from '../GetToolCallResults/GetToolCallResults.ts'
import { makeAiRequest } from '../MakeAiRequest/MakeAiRequest.ts'

export interface AiLoopIterationOptions {
  readonly systemPrompt: string
  readonly toolCalls: readonly ToolCall<unknown>[]
  readonly url: string
}

interface AiLoopIterationSuccessResult {
  readonly data: string
  readonly toolCalls: readonly ToolCall<unknown>[]
  readonly type: 'success'
}

interface AiLoopIterationErrorResult {
  readonly error: Error
  readonly type: 'error'
}

type AiLoopIterationResult = AiLoopIterationSuccessResult | AiLoopIterationErrorResult

export const aiLoopIteration = async (loopOptions: AiLoopIterationOptions): Promise<AiLoopIterationResult> => {
  const { systemPrompt, toolCalls, url } = loopOptions

  const toolCallResults = await getToolCallResults(toolCalls)
  const result = await makeAiRequest({
    systemPrompt,
    toolCallResults,
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
  return {
    data: result.data,
    toolCalls,
    type: 'success',
  }
}
