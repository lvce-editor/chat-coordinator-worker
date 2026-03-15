import type { ChatModel } from '../ChatModel/ChatModel.ts'
import type { ChatSession } from '../ChatSession/ChatSession.ts'
import type { ChatViewFocus } from '../ChatViewFocus/ChatViewFocus.ts'
import type { ChatViewMode } from '../ChatViewMode/ChatViewMode.ts'
import type { ParsedMessage } from '../ParsedMessage/ParsedMessage.ts'
import type { Project } from '../Project/Project.ts'
export type { ChatMessage } from '../ChatMessage/ChatMessage.ts'
export type { ChatModel } from '../ChatModel/ChatModel.ts'
export type { Project } from '../Project/Project.ts'
export type { ChatSession } from '../ChatSession/ChatSession.ts'
export type { ChatViewFocus } from '../ChatViewFocus/ChatViewFocus.ts'
export type { ChatViewMode } from '../ChatViewMode/ChatViewMode.ts'

export interface ChatState {
  readonly aiSessionTitleGenerationEnabled: boolean
  readonly assetDir: string
  readonly chatListScrollTop: number
  readonly chatMessageFontFamily: string
  readonly chatMessageFontSize: number
  readonly chatMessageLineHeight: number
  readonly composerDropActive: boolean
  readonly composerDropEnabled: boolean
  readonly composerFontFamily: string
  readonly composerFontSize: number
  readonly composerHeight: number
  readonly composerLineHeight: number
  readonly composerValue: string
  readonly disposed?: boolean
  readonly emitStreamingFunctionCallEvents: boolean
  readonly errorCount: number
  readonly focus: ChatViewFocus
  readonly focused: boolean
  readonly headerHeight: number
  readonly height: number
  readonly initial: boolean
  readonly inputSource: 'user' | 'script'
  readonly lastNormalViewMode: 'list' | 'detail'
  readonly lastSubmittedSessionId: string
  readonly listItemHeight: number
  readonly maxComposerRows: number
  readonly messagesScrollTop: number
  readonly mockAiResponseDelay: number
  readonly mockApiCommandId: string
  readonly models: readonly ChatModel[]
  readonly nextMessageId: number
  readonly openApiApiBaseUrl: string
  readonly openApiApiKey: string
  readonly openApiApiKeyInput: string
  readonly openApiApiKeysSettingsUrl: string
  readonly openRouterApiBaseUrl: string
  readonly openRouterApiKey: string
  readonly openRouterApiKeyInput: string
  readonly openRouterApiKeysSettingsUrl: string
  readonly openRouterApiKeyState: 'idle' | 'saving'
  readonly parsedMessages: readonly ParsedMessage[]
  readonly passIncludeObfuscation: boolean
  readonly platform: number
  readonly projectExpandedIds: readonly string[]
  readonly projectListScrollTop: number
  readonly projects: readonly Project[]
  readonly renamingSessionId: string
  readonly selectedModelId: string
  readonly selectedProjectId: string
  readonly selectedSessionId: string
  readonly sessions: readonly ChatSession[]
  readonly streamingEnabled: boolean
  readonly tokensMax: number
  readonly tokensUsed: number
  readonly uid: number
  readonly usageOverviewEnabled: boolean
  readonly useChatMathWorker: boolean
  readonly useChatNetworkWorkerForRequests: boolean
  readonly useMockApi: boolean
  readonly viewMode: ChatViewMode
  readonly voiceDictationEnabled: boolean
  readonly warningCount: number
  readonly webSearchEnabled: boolean
  readonly width: number
  readonly x: number
  readonly y: number
}
