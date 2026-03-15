import type { ChatToolCallStatus } from '../ChatMessage/ChatMessage.ts'

export interface StreamingToolCall {
  readonly arguments: string
  readonly errorMessage?: string
  readonly errorStack?: string
  readonly id?: string
  readonly name: string
  readonly status?: ChatToolCallStatus
}
