/* eslint-disable prefer-destructuring */
import type { ChatMessage } from '../ChatState/ChatState.ts'
import type { GetAiResponseOptions } from '../GetAiResponseOptions/GetAiResponseOptions.ts'
import { executeChatTool, getBasicChatTools } from '../ChatTools/ChatTools.ts'
import { openApiApiKeyRequiredMessage, openRouterApiKeyRequiredMessage } from '../chatViewStrings/chatViewStrings.ts'
import { getClientRequestIdHeader } from '../GetClientRequestIdHeader/GetClientRequestIdHeader.ts'
import { getMockAiResponse } from '../GetMockAiResponse/GetMockAiResponse.ts'
import { getMockOpenApiAssistantText } from '../GetMockOpenApiAssistantText/GetMockOpenApiAssistantText.ts'
import { getMockOpenRouterAssistantText } from '../GetMockOpenRouterAssistantText/GetMockOpenRouterAssistantText.ts'
import { getOpenApiApiEndpoint } from '../GetOpenApiApiEndpoint/GetOpenApiApiEndpoint.ts'
import { getOpenApiAssistantText } from '../GetOpenApiAssistantText/GetOpenApiAssistantText.ts'
import { getOpenAiParams } from '../GetOpenApiAssistantText/GetOpenApiAssistantText.ts'
import { getOpenApiErrorMessage } from '../GetOpenApiErrorMessage/GetOpenApiErrorMessage.ts'
import { getOpenApiModelId } from '../GetOpenApiModelId/GetOpenApiModelId.ts'
import { getOpenRouterAssistantText } from '../GetOpenRouterAssistantText/GetOpenRouterAssistantText.ts'
import { getOpenRouterErrorMessage } from '../GetOpenRouterErrorMessage/GetOpenRouterErrorMessage.ts'
import { getOpenRouterModelId } from '../GetOpenRouterModelId/GetOpenRouterModelId.ts'
import { isOpenApiModel } from '../IsOpenApiModel/IsOpenApiModel.ts'
import { isOpenRouterModel } from '../IsOpenRouterModel/IsOpenRouterModel.ts'
import * as MockOpenApiRequest from '../MockOpenApiRequest/MockOpenApiRequest.ts'

export const getAiResponse = async ({
  assetDir,
  messageId,
  messages,
  mockAiResponseDelay = 800,
  mockApiCommandId,
  models,
  onDataEvent,
  onEventStreamFinished,
  onTextChunk,
  onToolCallsChunk,
  openApiApiBaseUrl,
  openApiApiKey,
  openRouterApiBaseUrl,
  openRouterApiKey,
  passIncludeObfuscation = false,
  platform,
  selectedModelId,
  streamingEnabled = true,
  useChatNetworkWorkerForRequests = false,
  useMockApi,
  userText,
  webSearchEnabled = false,
}: GetAiResponseOptions): Promise<ChatMessage> => {
  let text = ''
  const usesOpenApiModel = isOpenApiModel(selectedModelId, models)
  const usesOpenRouterModel = isOpenRouterModel(selectedModelId, models)
  if (usesOpenApiModel) {
    if (useMockApi) {
      const openAiInput: any[] = messages.map((message) => ({
        content: message.text,
        role: message.role,
      }))
      const modelId = getOpenApiModelId(selectedModelId)
      const headers = {
        Authorization: `Bearer ${openApiApiKey}`,
        'Content-Type': 'application/json',
        ...getClientRequestIdHeader(),
      }
      const maxToolIterations = 4
      let previousResponseId: string | undefined
      for (let i = 0; i <= maxToolIterations; i++) {
        MockOpenApiRequest.capture({
          headers,
          method: 'POST',
          payload: getOpenAiParams(
            openAiInput,
            modelId,
            streamingEnabled,
            passIncludeObfuscation,
            getBasicChatTools(),
            webSearchEnabled,
            previousResponseId,
          ),
          url: getOpenApiApiEndpoint(openApiApiBaseUrl),
        })
        const result = await getMockOpenApiAssistantText(streamingEnabled, onTextChunk, onToolCallsChunk, onDataEvent, onEventStreamFinished)
        if (result.type !== 'success') {
          text = getOpenApiErrorMessage(result)
          break
        }
        text = result.text
        if (result.responseId) {
          previousResponseId = result.responseId
        }
        if (result.responseFunctionCalls.length === 0) {
          break
        }
        openAiInput.length = 0
        for (const toolCall of result.responseFunctionCalls) {
          const content = await executeChatTool(toolCall.name, toolCall.arguments, { assetDir, platform })
          openAiInput.push({
            call_id: toolCall.callId,
            output: content,
            type: 'function_call_output',
          })
        }
      }
    } else if (openApiApiKey) {
      const result = await getOpenApiAssistantText(
        messages,
        getOpenApiModelId(selectedModelId),
        openApiApiKey,
        openApiApiBaseUrl,
        assetDir,
        platform,
        {
          includeObfuscation: passIncludeObfuscation,
          ...(onDataEvent
            ? {
                onDataEvent,
              }
            : {}),
          ...(onEventStreamFinished
            ? {
                onEventStreamFinished,
              }
            : {}),
          ...(onTextChunk
            ? {
                onTextChunk,
              }
            : {}),
          ...(onToolCallsChunk
            ? {
                onToolCallsChunk,
              }
            : {}),
          stream: streamingEnabled,
          useChatNetworkWorkerForRequests,
          webSearchEnabled,
        },
      )
      if (result.type === 'success') {
        const { text: assistantText } = result
        text = assistantText
      } else {
        text = getOpenApiErrorMessage(result)
      }
    } else {
      text = openApiApiKeyRequiredMessage
    }
  } else if (usesOpenRouterModel) {
    const modelId = getOpenRouterModelId(selectedModelId)
    if (useMockApi) {
      const result = await getMockOpenRouterAssistantText(
        messages,
        modelId,
        openRouterApiBaseUrl,
        openRouterApiKey,
        mockApiCommandId,
        assetDir,
        platform,
      )
      if (result.type === 'success') {
        const { text: assistantText } = result
        text = assistantText
      } else {
        text = getOpenRouterErrorMessage(result)
      }
    } else if (openRouterApiKey) {
      const result = await getOpenRouterAssistantText(
        messages,
        modelId,
        openRouterApiKey,
        openRouterApiBaseUrl,
        assetDir,
        platform,
        useChatNetworkWorkerForRequests,
      )
      if (result.type === 'success') {
        const { text: assistantText } = result
        text = assistantText
      } else {
        text = getOpenRouterErrorMessage(result)
      }
    } else {
      text = openRouterApiKeyRequiredMessage
    }
  }
  if (!text && !usesOpenApiModel && !usesOpenRouterModel) {
    text = await getMockAiResponse(userText, mockAiResponseDelay)
  }
  const assistantTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const message: ChatMessage = {
    id: messageId || crypto.randomUUID(),
    role: 'assistant',
    text,
    time: assistantTime,
  }
  return message
}
