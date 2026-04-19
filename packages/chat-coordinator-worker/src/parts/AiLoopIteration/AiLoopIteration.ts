import type { AiLoopIterationOptions } from '../AiLoopIterationOptions/AiLoopIterationOptions.ts'
import type { AiLoopIterationResult } from '../AiLoopIterationResult/AiLoopIterationResult.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { getRedactedHeaders } from '../GetRedactedHeaders/GetRedactedHeaders.ts'
import { getToolCallResults } from '../GetToolCallResults/GetToolCallResults.ts'
import { makeAiRequest } from '../MakeAiRequest/MakeAiRequest.ts'

export const aiLoopIteration = async (loopOptions: AiLoopIterationOptions): Promise<AiLoopIterationResult> => {
  const { headers, modelId, sessionId, systemPrompt, toolCalls, turnId, url } = loopOptions
  const requestId = crypto.randomUUID()
  const requestBody = {
    input: [{ content: systemPrompt, role: 'system' }],
    model: modelId,
  }

  const toolCallResults = await getToolCallResults(toolCalls)
  await appendChatEvent({
    body: requestBody,
    headers: getRedactedHeaders(headers),
    method: 'POST',
    requestId,
    sessionId,
    turnId,
    type: ChatEventType.AiRequest,
  })
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
      type: ChatEventType.AiResponseError,
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
      type: ChatEventType.AiResponseSuccess,
      value: result.data,
    })
  }
  return {
    data: result.data,
    toolCalls,
    type: 'success',
  }
}
