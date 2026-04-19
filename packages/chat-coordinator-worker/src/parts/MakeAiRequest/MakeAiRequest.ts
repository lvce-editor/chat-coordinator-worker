import type { AiRequestResult } from '../AiRequestResult/AiRequestResult.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'
import { makeNetworkRequest } from '../MakeNetworkRequest/MakeNetworkRequest.ts'

interface AiRequestOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly modelId: string
  readonly systemPrompt: string
  readonly toolCallResults: readonly ToolCallResult[]
  readonly toolCalls: readonly ToolCall<any>[]
  readonly url: string
}

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
    toolCalls,
    type: 'success',
  }
}
