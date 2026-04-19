import type { AiRequestResult } from '../AiRequestResult/AiRequestResult.ts'
import type { AiRequestOptions } from '../AiRequestOptions/AiRequestOptions.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import { makeNetworkRequest } from '../MakeNetworkRequest/MakeNetworkRequest.ts'

export const makeAiRequest = async (options: AiRequestOptions): Promise<AiRequestResult> => {
  const { headers, modelId, systemPrompt, url } = options
  const response = await makeNetworkRequest({
    body: {
      input: [{ content: systemPrompt, role: 'system' }],
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
