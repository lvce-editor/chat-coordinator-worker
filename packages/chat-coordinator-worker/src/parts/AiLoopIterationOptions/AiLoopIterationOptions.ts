import type { ChatTool } from '../ChatTool/ChatTool.ts'
import type { AiRequestMessageInput } from '../GetAiRequestBody/GetAiRequestBody.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

export interface AiLoopIterationOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly maxToolCalls: number
  readonly modelId: string
  readonly providerId: string
  readonly sessionId: string
  readonly systemPrompt: string
  readonly text: string | readonly AiRequestMessageInput[]
  readonly toolCallResults: readonly ToolCallResult[]
  readonly toolCalls: readonly ToolCall<unknown>[]
  readonly tools: readonly ChatTool[]
  readonly turnId: string
  readonly url: string
}
