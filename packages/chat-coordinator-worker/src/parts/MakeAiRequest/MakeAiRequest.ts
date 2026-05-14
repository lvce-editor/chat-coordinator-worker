import type { AiRequestOptions } from '../AiRequestOptions/AiRequestOptions.ts'
import type { AiRequestResult } from '../AiRequestResult/AiRequestResult.ts'
import { getAiRequestOptions } from '../GetAiRequestOptions/GetAiRequestOptions.ts'
import { makeNetworkRequest } from '../MakeNetworkRequest/MakeNetworkRequest.ts'

export const makeAiRequest = async (options: AiRequestOptions): Promise<AiRequestResult> => {
  const { headers, modelId, providerId, systemPrompt, text: inputText, toolCallResults, url } = options
  const requestOptions = getAiRequestOptions({
    headers,
    modelId,
    providerId,
    systemPrompt,
    text: inputText,
    toolCallResults,
    url,
  })
  const response = await makeNetworkRequest(requestOptions)
  if (response.type === 'error') {
    return {
      error: response.error,
      size: response.size,
      statusCode: response.statusCode,
      type: 'error',
    }
  }
  return {
    data: response.data,
    headers: response.headers,
    size: response.size,
    statusCode: response.statusCode,
    type: 'success',
  }
}
