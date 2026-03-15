import type { ChatMessage } from '../ChatMessage/ChatMessage.ts'

export interface ChatSession {
  readonly id: string
  readonly messages: readonly ChatMessage[]
  readonly projectId?: string
  readonly title: string
}
