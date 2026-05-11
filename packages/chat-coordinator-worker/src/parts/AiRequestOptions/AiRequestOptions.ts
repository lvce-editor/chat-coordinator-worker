import type { AiRequestMessageInput } from '../GetAiRequestBody/GetAiRequestBody.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

export interface AiRequestOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly modelId: string
  readonly providerId: string
  readonly systemPrompt: string
  readonly text: string | readonly string[] | readonly AiRequestMessageInput[]
  readonly toolCallResults: readonly ToolCallResult[]
  readonly toolCalls: readonly ToolCall<any>[]
  readonly url: string
}
