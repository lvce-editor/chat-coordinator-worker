import type { ChatTool } from '../ChatTool/ChatTool.ts'
import type { AiRequestInput } from '../GetAiRequestBody/GetAiRequestBody.ts'

export interface AiLoopOptions {
  readonly headers: Readonly<Record<string, string>>
  readonly maxToolCalls: number
  readonly modelId: string
  readonly providerId: string
  readonly sessionId: string
  readonly systemPrompt: string
  readonly text: string | readonly AiRequestInput[]
  readonly tools: readonly ChatTool[]
  readonly turnId: string
  readonly url: string
}
