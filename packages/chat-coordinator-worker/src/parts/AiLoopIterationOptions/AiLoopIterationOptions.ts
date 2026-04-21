import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

export interface AiLoopIterationOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly modelId: string
  readonly sessionId: string
  readonly systemPrompt: string
  readonly text: string
  readonly toolCallResults: readonly ToolCallResult[]
  readonly toolCalls: readonly ToolCall<unknown>[]
  readonly turnId: string
  readonly url: string
}
