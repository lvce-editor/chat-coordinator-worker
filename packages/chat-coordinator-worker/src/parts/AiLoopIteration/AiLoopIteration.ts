import type { AiLoopIterationResult } from '../AiLoopIterationResult/AiLoopIterationResult.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import { getToolCallResults } from '../GetToolCallResults/GetToolCallResults.ts'
import { makeAiRequest } from '../MakeAiRequest/MakeAiRequest.ts'

export interface AiLoopIterationOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly modelId: string
  readonly requestId: string
  readonly sessionId: string
  readonly systemPrompt: string
  readonly toolCalls: readonly ToolCall<unknown>[]
  readonly url: string
}

export const aiLoopIteration = async (loopOptions: AiLoopIterationOptions): Promise<AiLoopIterationResult> => {
  const { headers, modelId, requestId, sessionId, systemPrompt, toolCalls, url } = loopOptions

  const toolCallResults = await getToolCallResults(toolCalls)
  const result = await makeAiRequest({
    headers,
    modelId,
    systemPrompt,
    toolCallResults,
    toolCalls,
    url,
  })

  if (result.type === 'error') {
    await appendChatEvent({
      requestId,
      sessionId,
      type: 'aiResponseError',
      value: result.error,
    })
    return {
      error: result.error,
      type: 'error',
    }
  } else {
    await appendChatEvent({
      headers: result.headers,
      requestId,
      sessionId,
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
