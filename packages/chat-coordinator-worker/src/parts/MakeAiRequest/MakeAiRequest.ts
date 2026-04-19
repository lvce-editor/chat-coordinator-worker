import type { AiRequestResult } from '../AiRequestResult/AiRequestResult.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import { makeNetworkRequest } from '../MakeNetworkRequest/MakeNetworkRequest.ts'

export const makeAiRequest = async (systemPrompt: string): Promise<AiRequestResult> => {
  const response = await makeNetworkRequest({
    body: {
      systemPrompt,
    },
    method: 'POST',
    url: 'https://api.openai.com/v1/chat/completions',
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
