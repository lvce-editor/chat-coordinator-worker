import type { ChatViewEvent } from '../ChatViewEvent/ChatViewEvent.ts'
import type {
  ChatCoordinatorHandleSubmitErrorResult,
  ChatCoordinatorHandleSubmitOptions,
  ChatCoordinatorHandleSubmitSuccessResult,
  ChatCoordinatorMessage,
  ChatCoordinatorSession,
} from '../CoordinatorState/CoordinatorTypes.ts'
import { defaultAgentMode } from '../AgentMode/AgentMode.ts'
import { appendChatViewEvent, getChatViewEvents, listChatSessions } from '../ChatSessionStorage/ChatSessionStorage.ts'
import { execute as executeToolRequest } from '../ChatToolRequest/ChatToolRequest.ts'
import { getAiResponse } from '../GetAiResponse/GetAiResponse.ts'
import { getSystemPromptForAgentMode } from '../GetSystemPromptForAgentMode/GetSystemPromptForAgentMode.ts'

interface HandleSubmitHooks {
  readonly onMessageAppended?: (sessionId: string, message: ChatCoordinatorMessage) => void
  readonly onMessageUpdated?: (runId: string, sessionId: string, message: ChatCoordinatorMessage) => void
  readonly onRunFinished?: (runId: string, sessionId: string) => void
  readonly onRunStarted?: (assistantMessageId: string, runId: string, sessionId: string) => void
  readonly onSessionCreated?: (session: ChatCoordinatorSession) => void
}

export interface StartHandleSubmitSuccessResult extends ChatCoordinatorHandleSubmitSuccessResult {
  readonly runPromise: Promise<void>
}

export type StartHandleSubmitResult = ChatCoordinatorHandleSubmitErrorResult | StartHandleSubmitSuccessResult

const getLocalTime = (timestamp: string = new Date().toISOString()): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const createMessage = (
  role: ChatCoordinatorMessage['role'],
  text: string,
  id: string = crypto.randomUUID(),
  time: string = getLocalTime(),
): ChatCoordinatorMessage => {
  return {
    id,
    role,
    text,
    time,
  }
}

const serializeValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  if (value === undefined) {
    return '{}'
  }
  return JSON.stringify(value)
}

const getErrorPayload = (error: unknown): { readonly error: string; readonly errorStack?: string } => {
  if (error instanceof Error) {
    return {
      error: error.message,
      ...(error.stack
        ? {
            errorStack: error.stack,
          }
        : {}),
    }
  }
  return {
    error: 'Unknown tool execution error',
  }
}

const getToolExecutionStatus = (value: unknown): 'error' | 'success' => {
  if (!value || typeof value !== 'object') {
    return 'success'
  }
  const error = Reflect.get(value, 'error')
  return typeof error === 'string' && error.trim() ? 'error' : 'success'
}

const getTextChunkFromDataEvent = (value: unknown): string => {
  if (!value || typeof value !== 'object') {
    return ''
  }
  const eventType = Reflect.get(value, 'type')
  if (eventType === 'response.output_text.delta') {
    const delta = Reflect.get(value, 'delta')
    return typeof delta === 'string' ? delta : ''
  }
  const choices = Reflect.get(value, 'choices')
  if (!Array.isArray(choices) || choices.length === 0) {
    return ''
  }
  const firstChoice = choices[0]
  if (!firstChoice || typeof firstChoice !== 'object') {
    return ''
  }
  const delta = Reflect.get(firstChoice, 'delta')
  if (!delta || typeof delta !== 'object') {
    return ''
  }
  const content = Reflect.get(delta, 'content')
  return typeof content === 'string' ? content : ''
}

const replayMessagesFromEvents = (events: readonly ChatViewEvent[]): readonly ChatCoordinatorMessage[] => {
  const messages: ChatCoordinatorMessage[] = []
  for (const event of events) {
    if (event.type === 'chat-message-added') {
      messages.push({
        ...event.message,
      })
      continue
    }
    if (event.type === 'chat-message-updated') {
      const index = messages.findIndex((message) => message.id === event.messageId)
      if (index === -1) {
        continue
      }
      messages[index] = {
        ...messages[index],
        ...(event.inProgress === undefined
          ? {}
          : {
              inProgress: event.inProgress,
            }),
        text: event.text,
        time: event.time,
        ...(event.toolCalls === undefined
          ? {}
          : {
              toolCalls: event.toolCalls,
            }),
      }
      continue
    }
    if (event.type === 'tool-execution-finished') {
      messages.push({
        id: `tool-${event.id}`,
        role: 'tool',
        text: serializeValue(event.result),
        time: getLocalTime(event.timestamp),
      })
    }
  }
  return messages.filter((message) => !message.inProgress)
}

const ensureSystemPrompt = (
  previousMessages: readonly ChatCoordinatorMessage[],
  options: Readonly<ChatCoordinatorHandleSubmitOptions>,
): readonly ChatCoordinatorMessage[] => {
  if (previousMessages.some((message) => message.role === 'system')) {
    return previousMessages
  }
  if (!options.systemPrompt) {
    return previousMessages
  }
  const resolvedSystemPrompt = getSystemPromptForAgentMode(options.systemPrompt, options.workspaceUri || '', options.agentMode || defaultAgentMode)
  const systemMessage = createMessage('system', resolvedSystemPrompt)
  return [systemMessage, ...previousMessages]
}

const appendUserVisibleMessage = async (sessionId: string, message: ChatCoordinatorMessage): Promise<void> => {
  await appendChatViewEvent({
    message,
    sessionId,
    timestamp: new Date().toISOString(),
    type: 'chat-message-added',
  })
}

const getDefaultTitle = async (): Promise<string> => {
  const sessions = await listChatSessions()
  return `Chat ${sessions.length + 1}`
}

export const startHandleSubmit = async (
  options: Readonly<ChatCoordinatorHandleSubmitOptions>,
  hooks: Readonly<HandleSubmitHooks> = {},
): Promise<StartHandleSubmitResult> => {
  const text = options.userText.trim()
  if (!text) {
    return {
      message: 'Prompt is empty.',
      type: 'error',
    }
  }

  const sessionId = options.sessionId || crypto.randomUUID()
  const previousEvents = await getChatViewEvents(sessionId)
  if (previousEvents.length === 0) {
    const session: ChatCoordinatorSession = {
      id: sessionId,
      messages: [],
      ...(options.projectId
        ? {
            projectId: options.projectId,
          }
        : {}),
      title: await getDefaultTitle(),
    }
    await appendChatViewEvent({
      sessionId,
      timestamp: new Date().toISOString(),
      title: session.title,
      type: 'chat-session-created',
    })
    hooks.onSessionCreated?.(session)
  }

  await appendChatViewEvent({
    sessionId,
    timestamp: new Date().toISOString(),
    type: 'handle-submit',
    value: text,
  })

  const userMessage = createMessage('user', text, options.messageId || crypto.randomUUID())
  const assistantMessage = {
    ...createMessage('assistant', ''),
    inProgress: true,
  } satisfies ChatCoordinatorMessage
  await appendUserVisibleMessage(sessionId, userMessage)
  await appendUserVisibleMessage(sessionId, assistantMessage)
  hooks.onMessageAppended?.(sessionId, userMessage)
  hooks.onMessageAppended?.(sessionId, assistantMessage)

  const previousMessages = ensureSystemPrompt(replayMessagesFromEvents(previousEvents), options)
  const aiMessages = [...previousMessages, ...(options.contextMessages || []), userMessage]
  const runId = crypto.randomUUID()
  hooks.onRunStarted?.(assistantMessage.id, runId, sessionId)

  const runPromise = (async (): Promise<void> => {
    let assistantText = ''
    let assistantToolCalls: ChatCoordinatorMessage['toolCalls'] = assistantMessage.toolCalls
    let streamedText = ''

    const updateAssistantMessage = async (
      inProgress: boolean,
      nextText: string,
      toolCalls: ChatCoordinatorMessage['toolCalls'] = assistantToolCalls,
    ): Promise<void> => {
      assistantText = nextText
      assistantToolCalls = toolCalls
      const updatedMessage: ChatCoordinatorMessage = {
        ...assistantMessage,
        inProgress,
        text: nextText,
        ...(toolCalls === undefined
          ? {}
          : {
              toolCalls,
            }),
      }
      await appendChatViewEvent({
        inProgress,
        messageId: assistantMessage.id,
        sessionId,
        text: nextText,
        time: assistantMessage.time,
        timestamp: new Date().toISOString(),
        ...(toolCalls === undefined
          ? {}
          : {
              toolCalls,
            }),
        type: 'chat-message-updated',
      })
      hooks.onMessageUpdated?.(runId, sessionId, updatedMessage)
    }

    const executeTool = async (
      name: string,
      rawArguments: string,
      toolOptions: { readonly assetDir: string; readonly callId: string; readonly platform: number },
    ): Promise<string> => {
      const startedAt = new Date().toISOString()
      await appendChatViewEvent({
        arguments: rawArguments,
        id: toolOptions.callId,
        name,
        options: {
          assetDir: toolOptions.assetDir,
          platform: toolOptions.platform,
        },
        sessionId,
        time: getLocalTime(startedAt),
        timestamp: startedAt,
        type: 'tool-execution-started',
      })
      let result: unknown
      let status: 'error' | 'success'
      let serializedResult: string
      try {
        result = await executeToolRequest(name, rawArguments, {
          assetDir: toolOptions.assetDir,
          platform: toolOptions.platform,
        })
        status = getToolExecutionStatus(result)
        serializedResult = serializeValue(result)
      } catch (error) {
        status = 'error'
        result = getErrorPayload(error)
        serializedResult = serializeValue(result)
      }
      await appendChatViewEvent({
        id: toolOptions.callId,
        name,
        result,
        sessionId,
        status,
        timestamp: new Date().toISOString(),
        type: 'tool-execution-finished',
      })
      return serializedResult
    }

    try {
      const responseMessage = await getAiResponse({
        assetDir: options.assetDir,
        executeTool,
        ...(options.mockAiResponseDelay === undefined
          ? {}
          : {
              mockAiResponseDelay: options.mockAiResponseDelay,
            }),
        messageId: assistantMessage.id,
        messages: aiMessages,
        mockApiCommandId: options.mockApiCommandId,
        models: options.models,
        nextMessageId: aiMessages.length + 1,
        onDataEvent: async (value: unknown): Promise<void> => {
          streamedText += getTextChunkFromDataEvent(value)
          await appendChatViewEvent({
            sessionId,
            timestamp: new Date().toISOString(),
            type: 'sse-response-part',
            value,
          })
        },
        onEventStreamFinished: async (): Promise<void> => {
          await appendChatViewEvent({
            sessionId,
            timestamp: new Date().toISOString(),
            type: 'event-stream-finished',
            value: '[DONE]',
          })
        },
        onTextChunk: async (chunk: string): Promise<void> => {
          await updateAssistantMessage(true, `${assistantText}${chunk}`)
        },
        onToolCallsChunk: async (toolCalls): Promise<void> => {
          await updateAssistantMessage(true, assistantText, toolCalls)
        },
        openApiApiBaseUrl: options.openApiApiBaseUrl,
        openApiApiKey: options.openApiApiKey,
        openRouterApiBaseUrl: options.openRouterApiBaseUrl,
        openRouterApiKey: options.openRouterApiKey,
        ...(options.passIncludeObfuscation === undefined
          ? {}
          : {
              passIncludeObfuscation: options.passIncludeObfuscation,
            }),
        platform: options.platform,
        selectedModelId: options.selectedModelId,
        ...(options.streamingEnabled === undefined
          ? {}
          : {
              streamingEnabled: options.streamingEnabled,
            }),
        ...(options.useChatNetworkWorkerForRequests === undefined
          ? {}
          : {
              useChatNetworkWorkerForRequests: options.useChatNetworkWorkerForRequests,
            }),
        useMockApi: options.useMockApi,
        userText: text,
        ...(options.webSearchEnabled === undefined
          ? {}
          : {
              webSearchEnabled: options.webSearchEnabled,
            }),
      })
      await updateAssistantMessage(false, assistantText || responseMessage.text || streamedText, responseMessage.toolCalls || assistantToolCalls)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete chat request.'
      await updateAssistantMessage(false, errorMessage, assistantToolCalls)
    } finally {
      hooks.onRunFinished?.(runId, sessionId)
    }
  })()

  return {
    assistantMessageId: assistantMessage.id,
    runId,
    runPromise,
    sessionId,
    type: 'success',
    userMessageId: userMessage.id,
  }
}
