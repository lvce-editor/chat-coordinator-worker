import type { AiRequestResult } from '../AiRequestResult/AiRequestResult.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import { makeNetworkRequest } from '../MakeNetworkRequest/MakeNetworkRequest.ts'

interface AiRequestOptions {
  readonly systemPrompt: string
  readonly url: string
}

export const makeAiRequest = async (options: AiRequestOptions): Promise<AiRequestResult> => {
  const { systemPrompt, url } = options
  const response = await makeNetworkRequest({
    body: {
      systemPrompt,
    },
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
    toolCalls,
    type: 'success',
  }
}
