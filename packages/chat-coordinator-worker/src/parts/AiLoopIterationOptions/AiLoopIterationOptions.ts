import type { ToolCall } from '../ToolCall/ToolCall.ts'

export interface AiLoopIterationOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly modelId: string
  readonly requestId: string
  readonly sessionId: string
  readonly systemPrompt: string
  readonly toolCalls: readonly ToolCall<unknown>[]
  readonly url: string
}
