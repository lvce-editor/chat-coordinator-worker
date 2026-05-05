import type { AiLoopIterationOptions } from '../AiLoopIterationOptions/AiLoopIterationOptions.ts'
import type { AiLoopIterationResult } from '../AiLoopIterationResult/AiLoopIterationResult.ts'
import type { AiRequestInput } from '../GetAiRequestBody/GetAiRequestBody.ts'
import { appendChatDebugEvent } from '../AppendChatDebugEvent/AppendChatDebugEvent.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { extractAiResponse } from '../ExtractAiResponseText/ExtractAiResponseText.ts'
import { getAiRequestBody } from '../GetAiRequestBody/GetAiRequestBody.ts'
import { getError } from '../GetError/GetError.ts'
import { getRedactedHeaders } from '../GetRedactedHeaders/GetRedactedHeaders.ts'
import { getVisibleAiErrorMessage } from '../GetVisibleAiErrorMessage/GetVisibleAiErrorMessage.ts'
import { makeAiRequest } from '../MakeAiRequest/MakeAiRequest.ts'

interface AiLoopIterationAiRequestOptions {
  readonly headers: AiLoopIterationOptions['headers']
  readonly messages: readonly AiRequestInput[]
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

interface AppendVisibleAiErrorMessageOptions {
  readonly error: unknown
  readonly requestId: string
  readonly sessionId: string
  readonly statusCode?: number
  readonly timestamp: string
}

interface AppendAiErrorResponseOptions {
  readonly error: unknown
  readonly requestId: string
  readonly sessionId: string
  readonly statusCode?: number
  readonly timestamp: string
  readonly turnId: string
}

const appendVisibleAiErrorMessage = async (options: AppendVisibleAiErrorMessageOptions): Promise<void> => {
  const { error, requestId, sessionId, statusCode, timestamp } = options
  const text = getVisibleAiErrorMessage(error, statusCode)
  await appendChatEvent({
    id: requestId,
    message: {
      content: [
        {
          text,
          type: 'text',
        },
      ],
      role: 'assistant',
    },
    requestId,
    sessionId,
    timestamp,
    type: ChatEventType.Message,
  })
}

const appendAiErrorResponse = async (options: AppendAiErrorResponseOptions): Promise<void> => {
  const { error, requestId, sessionId, statusCode, timestamp, turnId } = options
  await appendChatDebugEvent({
    ...(typeof statusCode === 'number' ? { statusCode } : {}),
    requestId,
    sessionId,
    timestamp,
    turnId,
    type: ChatEventType.AiResponse,
    value: error,
  })
}

export const aiLoopIterationAiRequest = async (options: AiLoopIterationAiRequestOptions): Promise<AiLoopIterationResult> => {
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
  let result
  try {
    result = await makeAiRequest({
      headers,
      modelId,
      systemPrompt,
      text: messages,
      toolCallResults,
      toolCalls,
      url,
    })
  } catch (error) {
    const normalizedError = getError(error)
    await appendVisibleAiErrorMessage({
      error: normalizedError,
      requestId,
      sessionId,
      timestamp,
    })
    await appendAiErrorResponse({
      error: normalizedError,
      requestId,
      sessionId,
      timestamp,
      turnId,
    })
    return {
      error: normalizedError,
      type: 'error',
    }
  }

  if (result.type === 'error') {
    await appendVisibleAiErrorMessage({
      error: result.error,
      requestId,
      sessionId,
      statusCode: result.statusCode,
      timestamp,
    })
    await appendAiErrorResponse({
      error: result.error,
      requestId,
      sessionId,
      statusCode: result.statusCode,
      timestamp,
      turnId,
    })
    return {
      error: result.error,
      type: 'error',
    }
  }

  const { newToolCalls, text } = extractAiResponse(result.data)

  if (text) {
    await appendChatEvent({
      id: requestId,
      message: {
        content: [
          {
            text: text,
            type: 'text',
          },
        ],
        role: 'assistant',
      },
      requestId,
      sessionId,
      timestamp,
      type: ChatEventType.Message,
    })
  }

  await appendChatDebugEvent({
    headers: result.headers,
    requestId,
    sessionId,
    statusCode: result.statusCode,
    timestamp,
    toolCalls: newToolCalls,
    turnId,
    type: ChatEventType.AiResponse,
    value: result.data,
  })
  return {
    data: result.data,
    toolCallResults: [],
    toolCalls: newToolCalls,
    type: 'success',
  }
}
