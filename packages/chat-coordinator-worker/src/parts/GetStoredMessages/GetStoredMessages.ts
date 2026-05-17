import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import type { AiRequestFunctionCall, AiRequestInput, AiRequestPart } from '../GetAiRequestBody/GetAiRequestBody.ts'
import type { SubmitAttachment } from '../SubmitOptions/SubmitOptions.ts'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'
import { getAttachmentParts } from '../GetAttachmentParts/GetAttachmentParts.ts'
import { appendMissingAiRequestInputTail } from '../MergeAiRequestInputs/MergeAiRequestInputs.ts'

interface ToolCallsFinishedEvent {
  readonly sessionId: string
  readonly timestamp: string
  readonly toolCallResults: readonly ToolCallResult[]
  readonly type: typeof ChatEventType.ToolCallsFinished
}

interface StoredMessageContentPart {
  readonly arguments?: string
  readonly call_id?: string
  readonly name?: string
  readonly text?: string
  readonly type?: string
}

interface StoredToolCall {
  readonly arguments: string
  readonly errorMessage?: string
  readonly id?: string
  readonly name: string
  readonly result?: string
  readonly status?: 'error' | 'not-found' | 'success'
}

const serializeStoredValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  const serialized = JSON.stringify(value)
  return typeof serialized === 'string' ? serialized : 'null'
}

const getStoredMessageText = (message: { readonly content?: readonly StoredMessageContentPart[]; readonly text?: string }): string => {
  const contentText = (message.content || [])
    .filter(
      (part: StoredMessageContentPart) =>
        (part.type === 'text' || part.type === 'input_text') && typeof part.text === 'string' && part.text.length > 0,
    )
    .map((part: StoredMessageContentPart) => part.text)
    .join('')
  if (contentText) {
    return contentText
  }
  if (typeof message.text === 'string') {
    return message.text
  }
  return ''
}

const getStoredMessageParts = (message: {
  readonly content?: readonly StoredMessageContentPart[]
  readonly text?: string
}): readonly AiRequestPart[] => {
  const text = getStoredMessageText(message)
  if (!text) {
    return []
  }
  return [
    {
      text,
      type: 'input_text',
    },
  ]
}

const getStoredFunctionCalls = (message: {
  readonly content?: readonly StoredMessageContentPart[]
  readonly toolCalls?: readonly StoredToolCall[]
}): readonly AiRequestFunctionCall[] => {
  if (message.toolCalls && message.toolCalls.length > 0) {
    return message.toolCalls
      .filter((toolCall): toolCall is StoredToolCall & { readonly id: string } => typeof toolCall.id === 'string')
      .map((toolCall) => ({
        arguments: toolCall.arguments,
        call_id: toolCall.id,
        name: toolCall.name,
        type: 'function_call',
      }))
  }
  return (message.content || [])
    .filter(
      (
        part,
      ): part is StoredMessageContentPart & {
        readonly arguments: string
        readonly call_id: string
        readonly name: string
        readonly type: 'function_call'
      } => part.type === 'function_call' && typeof part.arguments === 'string' && typeof part.call_id === 'string' && typeof part.name === 'string',
    )
    .map((part) => ({
      arguments: part.arguments,
      call_id: part.call_id,
      name: part.name,
      type: 'function_call',
    }))
}

const getStoredFunctionCallOutputs = (message: { readonly toolCalls?: readonly StoredToolCall[] }): readonly AiRequestInput[] => {
  return (message.toolCalls || [])
    .filter(
      (toolCall): toolCall is StoredToolCall & { readonly id: string; readonly status: 'error' | 'not-found' | 'success' } =>
        typeof toolCall.id === 'string' && typeof toolCall.status === 'string',
    )
    .map((toolCall) => ({
      call_id: toolCall.id,
      output:
        toolCall.status === 'success'
          ? toolCall.result || 'null'
          : toolCall.errorMessage || JSON.stringify({ error: 'Tool call failed.' }),
      type: 'function_call_output' as const,
    }))
}

const parseToolCallArguments = (argumentsText: string): unknown => {
  try {
    return JSON.parse(argumentsText)
  } catch {
    return argumentsText
  }
}

const getPendingToolCalls = (message: { readonly toolCalls?: readonly StoredToolCall[] }): readonly ToolCall<unknown>[] => {
  return (message.toolCalls || [])
    .filter(
      (toolCall): toolCall is StoredToolCall & { readonly id: string } => typeof toolCall.id === 'string' && typeof toolCall.status === 'undefined',
    )
    .map((toolCall) => ({
      args: parseToolCallArguments(toolCall.arguments),
      id: toolCall.id,
      name: toolCall.name,
    }))
}

const getToolCallInputs = (toolCalls: readonly ToolCall<unknown>[]): readonly AiRequestFunctionCall[] => {
  return toolCalls.map((toolCall) => ({
    arguments: serializeStoredValue(toolCall.args),
    call_id: toolCall.id,
    name: toolCall.name,
    type: 'function_call',
  }))
}

const getToolCallOutputInputs = (toolCallResults: readonly ToolCallResult[]): readonly AiRequestInput[] => {
  return toolCallResults.map((toolCallResult) => ({
    call_id: toolCallResult.callId,
    output: serializeStoredValue(toolCallResult.type === 'success' ? toolCallResult.value : { error: toolCallResult.error }),
    type: 'function_call_output' as const,
  }))
}

interface StoredMessageEvent {
  readonly message: {
    readonly attachments?: readonly SubmitAttachment[]
    readonly content?: readonly StoredMessageContentPart[]
    readonly role?: 'assistant' | 'user'
  }
  readonly type: typeof ChatEventType.Message
}

interface StoredChatMessageAddedEvent {
  readonly message: {
    readonly attachments?: readonly SubmitAttachment[]
    readonly content?: readonly StoredMessageContentPart[]
    readonly role?: 'assistant' | 'user'
    readonly text?: string
    readonly toolCalls?: readonly StoredToolCall[]
  }
  readonly type: 'chat-message-added'
}

interface LegacyHandleSubmitEvent {
  readonly type: 'handle-submit'
  readonly value: string
}

interface StoredAiResponseSuccessEvent {
  readonly toolCalls?: readonly ToolCall<unknown>[]
  readonly type: typeof ChatEventType.AiResponse
}

type StoredEvent = LegacyHandleSubmitEvent | StoredAiResponseSuccessEvent | StoredChatMessageAddedEvent | StoredMessageEvent | ToolCallsFinishedEvent

const isKnownStoredEventType = (type: unknown): type is StoredEvent['type'] => {
  return (
    type === ChatEventType.Message ||
    type === 'chat-message-added' ||
    type === 'handle-submit' ||
    type === ChatEventType.AiResponse ||
    type === ChatEventType.ToolCallsFinished
  )
}

const getNormalizedStoredEvent = (event: unknown): StoredEvent | undefined => {
  if (!event || typeof event !== 'object') {
    return undefined
  }
  const type = Reflect.get(event, 'type')
  if (isKnownStoredEventType(type)) {
    return event as StoredEvent
  }
  const nestedMessage = Reflect.get(event, 'message')
  if (!nestedMessage || typeof nestedMessage !== 'object' || nestedMessage === event) {
    return undefined
  }
  return getNormalizedStoredEvent(nestedMessage)
}

interface StoredAiLoopState {
  readonly messages: readonly AiRequestInput[]
  readonly toolCallResults: readonly ToolCallResult[]
  readonly toolCalls: readonly ToolCall<unknown>[]
}

const isStoredMessageEvent = (event: StoredEvent): event is LegacyHandleSubmitEvent | StoredChatMessageAddedEvent | StoredMessageEvent => {
  return event.type === ChatEventType.Message || event.type === 'chat-message-added' || event.type === 'handle-submit'
}

const getStoredMessage = (event: LegacyHandleSubmitEvent | StoredChatMessageAddedEvent | StoredMessageEvent): readonly AiRequestInput[] => {
  if ('value' in event && typeof event.value === 'string') {
    return [
      {
        content: [
          {
            text: event.value,
            type: 'input_text',
          },
        ],
        role: 'user',
      },
    ]
  }
  if (!('message' in event)) {
    return []
  }
  const { attachments = [], role } = event.message
  if (role !== 'assistant' && role !== 'user') {
    return []
  }
  const textParts = getStoredMessageParts(event.message)
  const functionCalls = role === 'assistant' ? getStoredFunctionCalls(event.message) : []
  const functionCallOutputs = role === 'assistant' ? getStoredFunctionCallOutputs(event.message) : []
  const inputs: AiRequestInput[] = []
  if (attachments.length === 0) {
    if (textParts.length > 0) {
      inputs.push({
        content: textParts,
        role,
      })
    }
  } else {
    const parts: readonly AiRequestPart[] = [...textParts, ...getAttachmentParts(attachments)]
    if (parts.length > 0) {
      inputs.push({
        content: parts,
        role,
      })
    }
  }
  inputs.push(...functionCalls)
  inputs.push(...functionCallOutputs)
  return inputs
}

const isAiResponseSuccessEvent = (event: StoredEvent): event is StoredAiResponseSuccessEvent => {
  return event.type === ChatEventType.AiResponse
}

const isToolCallsFinishedEvent = (event: StoredEvent): event is ToolCallsFinishedEvent => {
  return event.type === ChatEventType.ToolCallsFinished
}

const isFunctionCallInput = (input: AiRequestInput): input is AiRequestFunctionCall => {
  return 'type' in input && input.type === 'function_call'
}

export const getStoredMessages = async (sessionId: string, fallbackText: string): Promise<readonly AiRequestInput[]> => {
  const state = await getStoredAiLoopState(sessionId, fallbackText, [], [])
  return state.messages
}

export const getStoredAiLoopState = async (
  sessionId: string,
  fallbackText: string | readonly AiRequestInput[],
  fallbackToolCalls: readonly ToolCall<unknown>[],
  fallbackToolCallResults: readonly ToolCallResult[],
): Promise<StoredAiLoopState> => {
  const events = await ChatStorageWorker.invoke('ChatStorage.getMessages', sessionId)
  const messages: AiRequestInput[] = []
  const seenFunctionCallIds = new Set<string>()
  let toolCalls = fallbackToolCalls
  let toolCallResults = fallbackToolCallResults

  for (const storedEvent of events as readonly StoredEvent[]) {
    const event = getNormalizedStoredEvent(storedEvent)
    if (!event) {
      continue
    }
    if (isStoredMessageEvent(event)) {
      const storedMessages = getStoredMessage(event)
      messages.push(...storedMessages)
      if ('message' in event && event.message && typeof event.message === 'object') {
        const pendingToolCalls = getPendingToolCalls(event.message)
        if (pendingToolCalls.length > 0) {
          toolCalls = pendingToolCalls
          toolCallResults = []
        } else if (event.message.toolCalls && event.message.toolCalls.length > 0) {
          toolCalls = []
          toolCallResults = []
        }
      }
      for (const storedMessage of storedMessages) {
        if (isFunctionCallInput(storedMessage)) {
          seenFunctionCallIds.add(storedMessage.call_id)
        }
      }
      continue
    }
    if (isAiResponseSuccessEvent(event)) {
      toolCalls = event.toolCalls || []
      const storedToolCallInputs = getToolCallInputs(toolCalls).filter((toolCall) => !seenFunctionCallIds.has(toolCall.call_id))
      messages.push(...storedToolCallInputs)
      for (const storedToolCallInput of storedToolCallInputs) {
        seenFunctionCallIds.add(storedToolCallInput.call_id)
      }
      toolCallResults = []
      continue
    }
    if (isToolCallsFinishedEvent(event)) {
      const { toolCallResults: eventToolCallResults } = event
      messages.push(...getToolCallOutputInputs(eventToolCallResults))
      toolCalls = []
      toolCallResults = []
    }
  }

  if (typeof fallbackText === 'string') {
    if (messages.length === 0) {
      messages.push({
        content: [
          {
            text: fallbackText,
            type: 'input_text',
          },
        ],
        role: 'user',
      })
    }
  } else {
    return {
      messages: appendMissingAiRequestInputTail(messages, fallbackText),
      toolCallResults,
      toolCalls,
    }
  }

  return {
    messages,
    toolCallResults,
    toolCalls,
  }
}
