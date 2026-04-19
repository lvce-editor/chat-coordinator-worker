import type { AiLoopIterationResult } from '../AiLoopIterationResult/AiLoopIterationResult.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
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

const getRedactedHeaders = (headers: Readonly<Record<string, string>>): Readonly<Record<string, string>> => {
  const redactedHeaders: Record<string, string> = {}

  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerName.toLowerCase() === 'authorization') {
      redactedHeaders[headerName] = headerValue.toLowerCase().startsWith('bearer ') ? 'Bearer [redacted]' : '[redacted]'
    } else {
      redactedHeaders[headerName] = headerValue
    }
  }

  return redactedHeaders
}

export const aiLoopIteration = async (loopOptions: AiLoopIterationOptions): Promise<AiLoopIterationResult> => {
  const { headers, modelId, requestId, sessionId, systemPrompt, toolCalls, url } = loopOptions
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
