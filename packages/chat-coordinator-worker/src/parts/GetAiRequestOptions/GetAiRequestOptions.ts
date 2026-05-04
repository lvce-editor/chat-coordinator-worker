import type { AiRequestOptions } from '../AiRequestOptions/AiRequestOptions.ts'
import type { NetworkRequestOptions } from '../NetworkRequestOptions/NetworkRequestOptions.ts'
import { getAiRequestBody } from '../GetAiRequestBody/GetAiRequestBody.ts'

interface GetAiRequestOptionsOptions {
  readonly headers: AiRequestOptions['headers']
  readonly modelId: AiRequestOptions['modelId']
  readonly systemPrompt: AiRequestOptions['systemPrompt']
  readonly text: AiRequestOptions['text']
  readonly url: AiRequestOptions['url']
}

export const getAiRequestOptions = (options: GetAiRequestOptionsOptions): NetworkRequestOptions => {
  const { headers, modelId, systemPrompt, text: inputText, url } = options
  return {
    body: {
      ...getAiRequestBody(systemPrompt, inputText),
      model: modelId,
    },
    headers,
    method: 'POST',
    url,
  }
}
