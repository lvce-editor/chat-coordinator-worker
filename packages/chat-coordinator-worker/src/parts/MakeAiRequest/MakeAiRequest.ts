import type { AiRequestOptions } from '../AiRequestOptions/AiRequestOptions.ts'
import type { AiRequestResult } from '../AiRequestResult/AiRequestResult.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import { getAiRequestBody } from '../GetAiRequestBody/GetAiRequestBody.ts'
import { makeNetworkRequest } from '../MakeNetworkRequest/MakeNetworkRequest.ts'

export const makeAiRequest = async (options: AiRequestOptions): Promise<AiRequestResult> => {
  const { headers, modelId, systemPrompt, text, url } = options
  const response = await makeNetworkRequest({
    body: {
      ...getAiRequestBody(systemPrompt, text),
      model: modelId,
    },
    headers,
    method: 'POST',
    url,
  })
  if (response.type === 'error') {
    return {
      error: response.error,
      type: 'error',
    }
  }
  const toolCalls: readonly ToolCall<any>[] = [] // TODO
  return {
    data: response.data,
    headers: response.headers,
    toolCalls,
    type: 'success',
  }
}
