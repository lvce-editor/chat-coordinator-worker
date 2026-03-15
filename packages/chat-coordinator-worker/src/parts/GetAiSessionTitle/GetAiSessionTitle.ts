import type { ChatModel } from '../ChatState/ChatState.ts'
import { getAiResponse } from '../GetAiResponse/GetAiResponse.ts'
import { isDefaultSessionTitle } from '../IsDefaultSessionTitle/IsDefaultSessionTitle.ts'
import { isOpenApiModel } from '../IsOpenApiModel/IsOpenApiModel.ts'
import { isOpenRouterModel } from '../IsOpenRouterModel/IsOpenRouterModel.ts'
import { sanitizeGeneratedTitle } from '../SanitizeGeneratedTitle/SanitizeGeneratedTitle.ts'

const getTimeString = (): string => {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface GetAiSessionTitleOptions {
  readonly assetDir: string
  readonly mockAiResponseDelay: number
  readonly mockApiCommandId: string
  readonly models: readonly ChatModel[]
  readonly nextMessageId: number
  readonly openApiApiBaseUrl: string
  readonly openApiApiKey: string
  readonly openRouterApiBaseUrl: string
  readonly openRouterApiKey: string
  readonly passIncludeObfuscation: boolean
  readonly platform: number
  readonly selectedModelId: string
  readonly useChatNetworkWorkerForRequests: boolean
  readonly useMockApi: boolean
}

export const getAiSessionTitle = async (options: GetAiSessionTitleOptions, userText: string, assistantText: string): Promise<string> => {
  const { models, openApiApiBaseUrl, openApiApiKey, openRouterApiBaseUrl, openRouterApiKey, selectedModelId, useMockApi } = options
  if (useMockApi) {
    return ''
  }
  const usesOpenApiModel = isOpenApiModel(selectedModelId, models)
  const usesOpenRouterModel = isOpenRouterModel(selectedModelId, models)
  if (usesOpenApiModel && !openApiApiKey) {
    return ''
  }
  if (usesOpenRouterModel && !openRouterApiKey) {
    return ''
  }
  if (!usesOpenApiModel && !usesOpenRouterModel) {
    return ''
  }

  const titlePrompt = `Create a concise title (max 6 words) for this conversation. Respond only with the title, no punctuation at the end.
User: ${userText}
Assistant: ${assistantText}`
  const promptMessage = {
    id: crypto.randomUUID(),
    role: 'user' as const,
    text: titlePrompt,
    time: getTimeString(),
  }
  const titleResponse = await getAiResponse({
    assetDir: options.assetDir,
    messages: [promptMessage],
    mockAiResponseDelay: options.mockAiResponseDelay,
    mockApiCommandId: options.mockApiCommandId,
    models,
    nextMessageId: options.nextMessageId,
    openApiApiBaseUrl,
    openApiApiKey,
    openRouterApiBaseUrl,
    openRouterApiKey,
    passIncludeObfuscation: options.passIncludeObfuscation,
    platform: options.platform,
    selectedModelId,
    streamingEnabled: false,
    useChatNetworkWorkerForRequests: options.useChatNetworkWorkerForRequests,
    useMockApi,
    userText: titlePrompt,
    webSearchEnabled: false,
  })
  const title = sanitizeGeneratedTitle(titleResponse.text)
  return title && !isDefaultSessionTitle(title) ? title : ''
}
