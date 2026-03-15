import type { ChatMessage, ChatModel } from '../ChatState/ChatState.ts'
import type { StreamingToolCall } from '../StreamingToolCall/StreamingToolCall.ts'

export interface GetAiResponseOptions {
  readonly assetDir: string
  readonly messageId?: string
  readonly messages: readonly ChatMessage[]
  readonly mockAiResponseDelay?: number
  readonly mockApiCommandId: string
  readonly models: readonly ChatModel[]
  readonly nextMessageId: number
  readonly onDataEvent?: (value: unknown) => Promise<void>
  readonly onEventStreamFinished?: () => Promise<void>
  readonly onTextChunk?: (chunk: string) => Promise<void>
  readonly onToolCallsChunk?: (toolCalls: readonly StreamingToolCall[]) => Promise<void>
  readonly openApiApiBaseUrl: string
  readonly openApiApiKey: string
  readonly openRouterApiBaseUrl: string
  readonly openRouterApiKey: string
  readonly passIncludeObfuscation?: boolean
  readonly platform: number
  readonly selectedModelId: string
  readonly streamingEnabled?: boolean
  readonly useChatNetworkWorkerForRequests?: boolean
  readonly useMockApi: boolean
  readonly userText: string
  readonly webSearchEnabled?: boolean
}
