export interface ChatCoordinatorMessage {
  readonly id: string
  readonly role: 'assistant' | 'tool' | 'user'
  readonly text: string
  readonly time: string
}

export interface ChatCoordinatorSession {
  readonly id: string
  readonly messages: readonly ChatCoordinatorMessage[]
  readonly title: string
}

export interface ChatCoordinatorSessionSummary {
  readonly id: string
  readonly messageCount: number
  readonly title: string
}

export interface ChatCoordinatorSubmitOptions {
  readonly sessionId?: string
  readonly text: string
}

export interface ChatCoordinatorSubmitErrorResult {
  readonly message: string
  readonly type: 'error'
}

export interface ChatCoordinatorSubmitSuccessResult {
  readonly assistantMessageId: string
  readonly sessionId: string
  readonly type: 'success'
  readonly userMessageId: string
}

export type ChatCoordinatorSubmitResult = ChatCoordinatorSubmitErrorResult | ChatCoordinatorSubmitSuccessResult

export interface ChatCoordinatorSessionCreatedEvent {
  readonly session: ChatCoordinatorSession
  readonly type: 'session-created'
}

export interface ChatCoordinatorSessionDeletedEvent {
  readonly sessionId: string
  readonly type: 'session-deleted'
}

export interface ChatCoordinatorSessionUpdatedEvent {
  readonly session: ChatCoordinatorSession
  readonly type: 'session-updated'
}

export type ChatCoordinatorEvent = ChatCoordinatorSessionCreatedEvent | ChatCoordinatorSessionDeletedEvent | ChatCoordinatorSessionUpdatedEvent
