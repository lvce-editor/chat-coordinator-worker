import type { ChatTool } from '../ChatTool/ChatTool.ts'
import type { AiRequestMessageInput } from '../GetAiRequestBody/GetAiRequestBody.ts'

export interface AiLoopOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly maxToolCalls: number
  readonly modelId: string
  readonly providerId: string
  readonly sessionId: string
  readonly systemPrompt: string
  readonly text: string | readonly AiRequestMessageInput[]
  readonly tools: readonly ChatTool[]
  readonly turnId: string
  readonly url: string
}
