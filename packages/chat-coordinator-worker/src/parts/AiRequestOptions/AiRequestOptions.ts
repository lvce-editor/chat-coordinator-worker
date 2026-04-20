import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'
import type { AiRequestInput } from '../GetAiRequestBody/GetAiRequestBody.ts'

export interface AiRequestOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly modelId: string
  readonly systemPrompt: string
  readonly text: string | readonly string[] | readonly AiRequestInput[]
  readonly toolCallResults: readonly ToolCallResult[]
  readonly toolCalls: readonly ToolCall<any>[]
  readonly url: string
}
