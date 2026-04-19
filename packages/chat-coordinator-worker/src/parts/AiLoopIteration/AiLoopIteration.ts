import type { AiLoopIterationOptions } from '../AiLoopIterationOptions/AiLoopIterationOptions.ts'
import type { AiLoopIterationResult } from '../AiLoopIterationResult/AiLoopIterationResult.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { getRedactedHeaders } from '../GetRedactedHeaders/GetRedactedHeaders.ts'
import { getRequestId } from '../GetRequestId/GetRequestId.ts'
import { getTimeStamp } from '../GetTimeStamp/GetTimeStamp.ts'
import { getToolCallResults } from '../GetToolCallResults/GetToolCallResults.ts'
import { makeAiRequest } from '../MakeAiRequest/MakeAiRequest.ts'

export const aiLoopIteration = async (loopOptions: AiLoopIterationOptions): Promise<AiLoopIterationResult> => {
  const { headers, modelId, sessionId, systemPrompt, toolCalls, turnId, url } = loopOptions
  const requestId = getRequestId()
  const timestamp = getTimeStamp()
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
    timestamp,
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
      timestamp,
      turnId,
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
      timestamp,
      toolCalls: result.toolCalls,
      turnId,
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
