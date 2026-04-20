import type { AiLoopIterationOptions } from '../AiLoopIterationOptions/AiLoopIterationOptions.ts'
import type { AiLoopIterationResult } from '../AiLoopIterationResult/AiLoopIterationResult.ts'
import type { AiRequestInput } from '../GetAiRequestBody/GetAiRequestBody.ts'
import { appendChatDebugEvent } from '../AppendChatDebugEvent/AppendChatDebugEvent.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { getAiRequestBody } from '../GetAiRequestBody/GetAiRequestBody.ts'
import { getRedactedHeaders } from '../GetRedactedHeaders/GetRedactedHeaders.ts'
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
      type: ChatEventType.AiResponse,
      value: result.error,
    })
    return {
      error: result.error,
      type: 'error',
    }
  }

  if (result.text) {
    await appendChatEvent({
      id: requestId,
      message: {
        content: [
          {
            text: result.text,
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
    toolCalls: result.toolCalls,
    turnId,
    type: ChatEventType.AiResponse,
    value: result.data,
  })
  return {
    data: result.data,
    toolCallResults: [],
    toolCalls: result.toolCalls,
    type: 'success',
  }
}
