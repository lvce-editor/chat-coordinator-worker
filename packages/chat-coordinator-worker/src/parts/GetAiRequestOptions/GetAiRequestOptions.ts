import type { AiRequestOptions } from '../AiRequestOptions/AiRequestOptions.ts'
import type { NetworkRequestOptions } from '../NetworkRequestOptions/NetworkRequestOptions.ts'
import { getAiRequestBody } from '../GetAiRequestBody/GetAiRequestBody.ts'

interface GetAiRequestOptionsOptions {
  readonly headers: AiRequestOptions['headers']
  readonly maxToolCalls: AiRequestOptions['maxToolCalls']
  readonly modelId: AiRequestOptions['modelId']
  readonly providerId: AiRequestOptions['providerId']
  readonly systemPrompt: AiRequestOptions['systemPrompt']
  readonly text: AiRequestOptions['text']
  readonly toolCallResults: AiRequestOptions['toolCallResults']
  readonly tools: AiRequestOptions['tools']
  readonly url: AiRequestOptions['url']
}

export const getAiRequestOptions = (options: GetAiRequestOptionsOptions): NetworkRequestOptions => {
  const { headers, maxToolCalls, modelId, providerId, systemPrompt, text: inputText, toolCallResults, tools, url } = options
  return {
    body: {
      ...getAiRequestBody(systemPrompt, inputText, toolCallResults),
      max_tool_calls: maxToolCalls,
      model: modelId,
      tool_choice: 'auto',
      tools,
    },
    headers,
    method: 'POST',
    providerId,
    url,
  }
}
