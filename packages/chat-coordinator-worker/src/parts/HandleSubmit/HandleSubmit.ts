import type { SubmitOptions } from '../SubmitOptions/SubmitOptions.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { addPendingSessionWork, processQueue } from '../ProcessQueue/ProcessQueue.ts'

const openApiApiKeyRequiredMessage = 'OpenAI API key is not configured. Enter your OpenAI API key below and click Save.'

const getBackendResponsesEndpoint = (backendUrl: string): string => {
  return backendUrl.endsWith('/') ? `${backendUrl}v1/responses` : `${backendUrl}/v1/responses`
}

const normalizeOpenAiModelId = (modelId: string): string => {
  const normalizedModelId = modelId.toLowerCase()
  if (normalizedModelId.startsWith('openapi/')) {
    return modelId.slice('openapi/'.length)
  }
  if (normalizedModelId.startsWith('openai/')) {
    return modelId.slice('openai/'.length)
  }
  return modelId
}

const isTestModel = (modelId: string): boolean => {
  return modelId === 'test'
}

export const handleSubmit = async (options: SubmitOptions): Promise<void> => {
  const {
    authAccessToken = '',
    backendUrl = '',
    id,
    modelId,
    openAiKey,
    requestId,
    role,
    sessionId,
    systemPrompt,
    text,
    useOwnBackend = false,
  } = options
  const date = new Date()
  const timestamp = date.toISOString()

  await appendChatEvent({
    id,
    message: {
      content: [
        {
          text,
          type: 'text',
        },
      ],
      role,
    },
    requestId,
    sessionId,
    timestamp,
    type: ChatEventType.Message,
  })

  if (!isTestModel(modelId) && !useOwnBackend && !openAiKey.trim()) {
    await appendChatEvent({
      id: requestId,
      message: {
        content: [
          {
            text: openApiApiKeyRequiredMessage,
            type: 'text',
          },
        ],
        role: 'assistant',
      },
      requestId,
      sessionId,
      timestamp,
      type: ChatEventType.Message,
    })
    return
  }

  addPendingSessionWork({
    headers: {
      Authorization: `Bearer ${useOwnBackend ? authAccessToken : openAiKey}`,
      'Content-Type': 'application/json',
    },
    modelId: normalizeOpenAiModelId(modelId),
    providerId: useOwnBackend ? 'backend' : 'openai',
    sessionId,
    systemPrompt,
    text,
    turnId: requestId,
    url: useOwnBackend ? getBackendResponsesEndpoint(backendUrl) : 'https://api.openai.com/v1/responses',
  })
  await processQueue(sessionId)
}
