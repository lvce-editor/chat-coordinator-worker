import type { AiLoopIterationOptions } from '../AiLoopIterationOptions/AiLoopIterationOptions.ts'
import type { AiLoopIterationResult } from '../AiLoopIterationResult/AiLoopIterationResult.ts'
import { appendChatDebugEvent } from '../AppendChatDebugEvent/AppendChatDebugEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { getAiRequestBody } from '../GetAiRequestBody/GetAiRequestBody.ts'
import { getRedactedHeaders } from '../GetRedactedHeaders/GetRedactedHeaders.ts'
import { getRequestId } from '../GetRequestId/GetRequestId.ts'
import { getStoredAiLoopState } from '../GetStoredMessages/GetStoredMessages.ts'
import { getTimeStamp } from '../GetTimeStamp/GetTimeStamp.ts'
import { getToolCallResults } from '../GetToolCallResults/GetToolCallResults.ts'
import { makeAiRequest } from '../MakeAiRequest/MakeAiRequest.ts'

interface AiLoopIterationToolCallOptions {
  readonly requestId: string
  readonly sessionId: string
  readonly timestamp: string
  readonly toolCalls: AiLoopIterationOptions['toolCalls']
  readonly turnId: string
}

interface AiLoopIterationAiRequestOptions {
  readonly headers: AiLoopIterationOptions['headers']
  readonly messages: readonly string[]
  readonly modelId: string
  readonly requestId: string
  readonly sessionId: string
  readonly systemPrompt: string
  readonly timestamp: string
  readonly toolCallResults: AiLoopIterationOptions['toolCallResults']
  readonly toolCalls: AiLoopIterationOptions['toolCalls']
  readonly turnId: string
  readonly url: string
}

const aiLoopIterationToolCall = async (options: AiLoopIterationToolCallOptions): Promise<AiLoopIterationResult> => {
  const { requestId, sessionId, timestamp, toolCalls, turnId } = options
  const resolvedToolCallResults = await getToolCallResults(toolCalls)
  await appendChatDebugEvent({
    requestId,
    sessionId,
    timestamp,
    toolCallResults: resolvedToolCallResults,
    turnId,
    type: ChatEventType.ToolCallsFinished,
  })
  return {
    data: undefined,
    toolCallResults: resolvedToolCallResults,
    toolCalls: [],
    type: 'success',
  }
}

const aiLoopIterationAiRequest = async (options: AiLoopIterationAiRequestOptions): Promise<AiLoopIterationResult> => {
  const { headers, messages, modelId, requestId, sessionId, systemPrompt, timestamp, toolCallResults, toolCalls, turnId, url } = options
  const requestBody = {
    ...getAiRequestBody(systemPrompt, messages),
    model: modelId,
  }

  await appendChatDebugEvent({
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
    text: messages,
    toolCallResults,
    toolCalls,
    url,
  })

  if (result.type === 'error') {
    await appendChatDebugEvent({
      requestId,
      sessionId,
      statusCode: result.statusCode,
      timestamp,
      turnId,
      type: ChatEventType.AiResponseError,
      value: result.error,
    })
    return {
      error: result.error,
      type: 'error',
    }
  }

  await appendChatDebugEvent({
    headers: result.headers,
    requestId,
    sessionId,
    statusCode: result.statusCode,
    timestamp,
    toolCalls: result.toolCalls,
    turnId,
    type: ChatEventType.AiResponseSuccess,
    value: result.data,
  })
  return {
    data: result.data,
    toolCallResults: [],
    toolCalls: result.toolCalls,
    type: 'success',
  }
}

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
