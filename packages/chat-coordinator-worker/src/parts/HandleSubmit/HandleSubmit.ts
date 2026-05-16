import type { AiRequestMessageInput, AiRequestPart } from '../GetAiRequestBody/GetAiRequestBody.ts'
import type { SubmitOptions } from '../SubmitOptions/SubmitOptions.ts'
import { appendChatEvent } from '../AppendChatEvent/AppendChatEvent.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { getAttachmentParts } from '../GetAttachmentParts/GetAttachmentParts.ts'
import { addPendingSessionWork, processQueue } from '../ProcessQueue/ProcessQueue.ts'

const openApiApiKeyRequiredMessage = 'OpenAI API key is not configured. Enter your OpenAI API key below and click Save.'
const defaultMaxToolCalls = 100

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

const getQueuedText = (text: string, role: SubmitOptions['role'], attachments: SubmitOptions['attachments']): readonly AiRequestMessageInput[] => {
  const content: AiRequestPart[] = []
  if (text) {
    content.push({
      text,
      type: 'input_text',
    })
  }
  content.push(...getAttachmentParts(attachments))
  return [
    {
      content,
      role,
    },
  ]
}

export const handleSubmit = async (options: SubmitOptions): Promise<void> => {
  const {
    attachments = [],
    authAccessToken = '',
    backendUrl = '',
    id,
    maxToolCalls = defaultMaxToolCalls,
    modelId,
    openAiKey,
    requestId,
    role,
    sessionId,
    systemPrompt,
    text,
    tools = [],
    useOwnBackend = false,
  } = options
  const date = new Date()
  const timestamp = date.toISOString()

  await appendChatEvent({
    id,
    message: {
      ...(attachments.length > 0
        ? {
            attachments,
          }
        : {}),
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
    maxToolCalls,
    modelId: normalizeOpenAiModelId(modelId),
    providerId: useOwnBackend ? 'backend' : 'openai',
    sessionId,
    systemPrompt,
    text: getQueuedText(text, role, attachments),
    tools,
    turnId: requestId,
    url: useOwnBackend ? getBackendResponsesEndpoint(backendUrl) : 'https://api.openai.com/v1/responses',
  })
  await processQueue(sessionId)
}
