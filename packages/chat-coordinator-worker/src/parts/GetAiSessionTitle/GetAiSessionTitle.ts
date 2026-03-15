import type { ChatState } from '../ChatState/ChatState.ts'
import { getAiResponse } from '../GetAiResponse/GetAiResponse.ts'
import { isDefaultSessionTitle } from '../IsDefaultSessionTitle/IsDefaultSessionTitle.ts'
import { isOpenApiModel } from '../IsOpenApiModel/IsOpenApiModel.ts'
import { isOpenRouterModel } from '../IsOpenRouterModel/IsOpenRouterModel.ts'
import { sanitizeGeneratedTitle } from '../SanitizeGeneratedTitle/SanitizeGeneratedTitle.ts'

export const getAiSessionTitle = async (state: ChatState, userText: string, assistantText: string): Promise<string> => {
  const { models, openApiApiBaseUrl, openApiApiKey, openRouterApiBaseUrl, openRouterApiKey, selectedModelId, useMockApi } = state
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
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
  const titleResponse = await getAiResponse({
    assetDir: state.assetDir,
    messages: [promptMessage],
    mockAiResponseDelay: state.mockAiResponseDelay,
    mockApiCommandId: state.mockApiCommandId,
    models,
    nextMessageId: state.nextMessageId,
    openApiApiBaseUrl,
    openApiApiKey,
    openRouterApiBaseUrl,
    openRouterApiKey,
    passIncludeObfuscation: state.passIncludeObfuscation,
    platform: state.platform,
    selectedModelId,
    streamingEnabled: false,
    useChatNetworkWorkerForRequests: state.useChatNetworkWorkerForRequests,
    useMockApi,
    userText: titlePrompt,
    webSearchEnabled: false,
  })
  const title = sanitizeGeneratedTitle(titleResponse.text)
  return title && !isDefaultSessionTitle(title) ? title : ''
}
