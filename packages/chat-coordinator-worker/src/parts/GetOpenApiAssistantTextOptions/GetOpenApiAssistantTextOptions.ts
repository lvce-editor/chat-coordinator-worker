import type { StreamingToolCall } from '../StreamingToolCall/StreamingToolCall.ts'

export interface GetOpenApiAssistantTextOptions {
  readonly includeObfuscation?: boolean
  readonly onDataEvent?: (value: unknown) => Promise<void>
  readonly onEventStreamFinished?: () => Promise<void>
  readonly onTextChunk?: (chunk: string) => Promise<void>
  readonly onToolCallsChunk?: (toolCalls: readonly StreamingToolCall[]) => Promise<void>
  readonly stream: boolean
  readonly useChatNetworkWorkerForRequests?: boolean
  readonly webSearchEnabled?: boolean
}
