import type { AiRequestOptions } from '../AiRequestOptions/AiRequestOptions.ts'
import type { AiRequestResult } from '../AiRequestResult/AiRequestResult.ts'
import { extractAiResponse } from '../ExtractAiResponseText/ExtractAiResponseText.ts'
import { getAiRequestBody } from '../GetAiRequestBody/GetAiRequestBody.ts'
import { makeNetworkRequest } from '../MakeNetworkRequest/MakeNetworkRequest.ts'

export const makeAiRequest = async (options: AiRequestOptions): Promise<AiRequestResult> => {
  const { headers, modelId, systemPrompt, text: inputText, url } = options
  const response = await makeNetworkRequest({
    body: {
      ...getAiRequestBody(systemPrompt, inputText),
      model: modelId,
    },
    headers,
    method: 'POST',
    url,
  })
  if (response.type === 'error') {
    return {
      error: response.error,
      statusCode: response.statusCode,
      type: 'error',
    }
  }
  const { text, toolCalls } = extractAiResponse(response.data)
  return {
    data: response.data,
    headers: response.headers,
    statusCode: response.statusCode,
    text,
    toolCalls,
    type: 'success',
  }
}
