import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

export interface AiRequestOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly modelId: string
  readonly systemPrompt: string
  readonly text: string | readonly string[]
  readonly toolCallResults: readonly ToolCallResult[]
  readonly toolCalls: readonly ToolCall<any>[]
  readonly url: string
}
