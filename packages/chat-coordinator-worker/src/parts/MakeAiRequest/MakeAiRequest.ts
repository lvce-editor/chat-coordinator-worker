import type { AiRequestOptions } from '../AiRequestOptions/AiRequestOptions.ts'
import type { AiRequestResult } from '../AiRequestResult/AiRequestResult.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import { extractAiResponseText } from '../ExtractAiResponseText/ExtractAiResponseText.ts'
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
  const responseText = extractAiResponseText(response.data)
  const toolCalls: readonly ToolCall<any>[] = [] // TODO normalize provider-specific tool calls
  return {
    data: response.data,
    headers: response.headers,
    statusCode: response.statusCode,
    text: responseText,
    toolCalls,
    type: 'success',
  }
}
