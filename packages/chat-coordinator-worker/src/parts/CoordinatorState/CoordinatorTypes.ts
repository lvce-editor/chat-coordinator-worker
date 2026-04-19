import type { AgentMode } from '../AgentMode/AgentMode.ts'
import type { ChatToolCall } from '../ChatMessage/ChatMessage.ts'
import type { ChatModel } from '../ChatModel/ChatModel.ts'

export interface ChatCoordinatorMessage {
  readonly id: string
  readonly inProgress?: boolean
  readonly role: 'assistant' | 'system' | 'tool' | 'user'
  readonly text: string
  readonly time: string
  readonly toolCalls?: readonly ChatToolCall[]
}

export interface ChatCoordinatorSession {
  readonly id: string
  readonly messages: readonly ChatCoordinatorMessage[]
  readonly projectId?: string
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

export interface ChatCoordinatorHandleSubmitOptions {
  readonly agentMode?: AgentMode
  readonly aiSessionTitleGenerationEnabled?: boolean
  readonly assetDir: string
  readonly contextMessages?: readonly ChatCoordinatorMessage[]
  readonly messageId?: string
  readonly mockAiResponseDelay?: number
  readonly mockApiCommandId: string
  readonly models: readonly ChatModel[]
  readonly openApiApiBaseUrl: string
  readonly openApiApiKey: string
  readonly openRouterApiBaseUrl: string
  readonly openRouterApiKey: string
  readonly passIncludeObfuscation?: boolean
  readonly platform: number
  readonly projectId?: string
  readonly selectedModelId: string
  readonly sessionId?: string
  readonly streamingEnabled?: boolean
  readonly systemPrompt?: string
  readonly useChatNetworkWorkerForRequests?: boolean
  readonly useMockApi: boolean
  readonly userText: string
  readonly webSearchEnabled?: boolean
  readonly workspaceUri?: string
}

export interface ChatCoordinatorSubmitErrorResult {
  readonly message: string
  readonly type: 'error'
}

export interface ChatCoordinatorSubmitSuccessResult {
  readonly assistantMessageId: string
  readonly runId: string
  readonly sessionId: string
  readonly type: 'success'
  readonly userMessageId: string
}

export interface ChatCoordinatorHandleSubmitErrorResult {
  readonly message: string
  readonly type: 'error'
}

export interface ChatCoordinatorHandleSubmitSuccessResult {
  readonly assistantMessageId: string
  readonly runId: string
  readonly sessionId: string
  readonly type: 'success'
  readonly userMessageId: string
}

export type ChatCoordinatorSubmitResult = ChatCoordinatorSubmitErrorResult | ChatCoordinatorSubmitSuccessResult
export type ChatCoordinatorHandleSubmitResult = ChatCoordinatorHandleSubmitErrorResult | ChatCoordinatorHandleSubmitSuccessResult

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

export interface ChatCoordinatorMessageAppendedEvent {
  readonly message: ChatCoordinatorMessage
  readonly sessionId: string
  readonly type: 'message-appended'
}

export interface ChatCoordinatorMessageUpdatedEvent {
  readonly message: ChatCoordinatorMessage
  readonly runId: string
  readonly sessionId: string
  readonly type: 'message-updated'
}

export interface ChatCoordinatorRunStartedEvent {
  readonly assistantMessageId: string
  readonly runId: string
  readonly sessionId: string
  readonly type: 'run-started'
}

export interface ChatCoordinatorRunFinishedEvent {
  readonly runId: string
  readonly sessionId: string
  readonly type: 'run-finished'
}

export interface ChatCoordinatorRunCancelledEvent {
  readonly runId: string
  readonly sessionId: string
  readonly type: 'run-cancelled'
}

export type ChatCoordinatorEvent =
  | ChatCoordinatorMessageAppendedEvent
  | ChatCoordinatorMessageUpdatedEvent
  | ChatCoordinatorRunCancelledEvent
  | ChatCoordinatorRunFinishedEvent
  | ChatCoordinatorRunStartedEvent
  | ChatCoordinatorSessionCreatedEvent
  | ChatCoordinatorSessionDeletedEvent
  | ChatCoordinatorSessionUpdatedEvent
