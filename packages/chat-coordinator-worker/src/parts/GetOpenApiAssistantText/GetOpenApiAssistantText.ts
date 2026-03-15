/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import type { ChatMessage } from '../ChatMessage/ChatMessage.ts'
import type { GetOpenApiAssistantTextErrorResult } from '../GetOpenApiAssistantTextErrorResult/GetOpenApiAssistantTextErrorResult.ts'
import type { GetOpenApiAssistantTextOptions } from '../GetOpenApiAssistantTextOptions/GetOpenApiAssistantTextOptions.ts'
import type { GetOpenApiAssistantTextSuccessResult } from '../GetOpenApiAssistantTextSuccessResult/GetOpenApiAssistantTextSuccessResult.ts'
import type { ResponseFunctionCall } from '../ResponseFunctionCall/ResponseFunctionCall.ts'
import type { StreamingToolCall } from '../StreamingToolCall/StreamingToolCall.ts'
import { makeApiRequest, makeStreamingApiRequest } from '../ChatNetworkRequest/ChatNetworkRequest.ts'
import { executeChatTool, getBasicChatTools } from '../ChatTools/ChatTools.ts'
import { getClientRequestIdHeader } from '../GetClientRequestIdHeader/GetClientRequestIdHeader.ts'
import { getOpenApiApiEndpoint } from '../GetOpenApiApiEndpoint/GetOpenApiApiEndpoint.ts'
import { getTextContent } from '../GetTextContent/GetTextContent.ts'

export type GetOpenApiAssistantTextResult = GetOpenApiAssistantTextSuccessResult | GetOpenApiAssistantTextErrorResult

const getOpenAiTools = (tools: readonly unknown[]): readonly unknown[] => {
  return tools.map((tool) => {
    if (!tool || typeof tool !== 'object') {
      return tool
    }
    const type = Reflect.get(tool, 'type')
    const toolFunction = Reflect.get(tool, 'function')
    if (type !== 'function' || !toolFunction || typeof toolFunction !== 'object') {
      return tool
    }
    const name = Reflect.get(toolFunction, 'name')
    const description = Reflect.get(toolFunction, 'description')
    const parameters = Reflect.get(toolFunction, 'parameters')
    return {
      ...(typeof description === 'string'
        ? {
            description,
          }
        : {}),
      ...(typeof name === 'string'
        ? {
            name,
          }
        : {}),
      ...(parameters && typeof parameters === 'object'
        ? {
            parameters,
          }
        : {}),
      type: 'function',
    }
  })
}

export const getOpenAiParams = (
  input: readonly unknown[],
  modelId: string,
  stream: boolean,
  includeObfuscation: boolean,
  tools: readonly unknown[],
  webSearchEnabled: boolean,
  previousResponseId?: string,
): object => {
  const openAiTools = getOpenAiTools(tools)
  return {
    input,
    model: modelId,
    ...(stream
      ? {
          stream: true,
          ...(includeObfuscation
            ? {}
            : {
                stream_options: {
                  include_obfuscation: false,
                },
              }),
        }
      : {}),
    ...(previousResponseId
      ? {
          previous_response_id: previousResponseId,
        }
      : {}),
    tool_choice: 'auto',
    tools: webSearchEnabled ? [...openAiTools, { type: 'web_search' }] : openAiTools,
  }
}

const getStreamChunkText = (content: unknown): string => {
  if (typeof content === 'string') {
    return content
  }
  if (!Array.isArray(content)) {
    return ''
  }
  return content
    .map((part) => {
      if (!part || typeof part !== 'object') {
        return ''
      }
      const text = Reflect.get(part, 'text')
      return typeof text === 'string' ? text : ''
    })
    .join('')
}

const getShortToolErrorMessage = (error: string): string => {
  const trimmed = error.trim().replace(/^Error:\s*/, '')
  const firstLine = trimmed.split('\n')[0]
  if (firstLine.length <= 80) {
    return firstLine
  }
  return `${firstLine.slice(0, 77)}...`
}

const getToolCallExecutionStatus = (content: string): Pick<StreamingToolCall, 'errorMessage' | 'errorStack' | 'status'> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(content) as unknown
  } catch {
    return {
      errorMessage: 'Invalid tool output',
      status: 'error',
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      errorMessage: 'Invalid tool output',
      status: 'error',
    }
  }
  const rawError = Reflect.get(parsed, 'error')
  if (typeof rawError !== 'string' || !rawError.trim()) {
    return {
      status: 'success',
    }
  }
  const rawStack = Reflect.get(parsed, 'errorStack') ?? Reflect.get(parsed, 'stack')
  const errorStack = typeof rawStack === 'string' && rawStack.trim() ? rawStack : undefined
  const errorMessage = getShortToolErrorMessage(rawError)
  if (/not[\s_-]?found|enoent/i.test(errorMessage)) {
    return {
      ...(errorStack
        ? {
            errorStack,
          }
        : {}),
      status: 'not-found',
    }
  }
  return {
    ...(errorStack
      ? {
          errorStack,
        }
      : {}),
    errorMessage,
    status: 'error',
  }
}

const getResponseOutputText = (parsed: unknown): string => {
  if (!parsed || typeof parsed !== 'object') {
    return ''
  }

  const outputText = Reflect.get(parsed, 'output_text')
  if (typeof outputText === 'string') {
    return outputText
  }

  const output = Reflect.get(parsed, 'output')
  if (!Array.isArray(output)) {
    return ''
  }

  const chunks: string[] = []
  for (const outputItem of output) {
    if (!outputItem || typeof outputItem !== 'object') {
      continue
    }
    const itemType = Reflect.get(outputItem, 'type')
    if (itemType !== 'message') {
      continue
    }
    const content = Reflect.get(outputItem, 'content')
    if (!Array.isArray(content)) {
      continue
    }
    for (const part of content) {
      if (!part || typeof part !== 'object') {
        continue
      }
      const partType = Reflect.get(part, 'type')
      const text = Reflect.get(part, 'text')
      if ((partType === 'output_text' || partType === 'text') && typeof text === 'string') {
        chunks.push(text)
      }
    }
  }
  return chunks.join('')
}

const getResponseFunctionCalls = (parsed: unknown): readonly ResponseFunctionCall[] => {
  if (!parsed || typeof parsed !== 'object') {
    return []
  }
  const output = Reflect.get(parsed, 'output')
  if (!Array.isArray(output)) {
    return []
  }
  const calls: ResponseFunctionCall[] = []
  for (const outputItem of output) {
    if (!outputItem || typeof outputItem !== 'object') {
      continue
    }
    const itemType = Reflect.get(outputItem, 'type')
    if (itemType !== 'function_call') {
      continue
    }
    const callId = Reflect.get(outputItem, 'call_id')
    const name = Reflect.get(outputItem, 'name')
    const rawArguments = Reflect.get(outputItem, 'arguments')
    if (typeof callId !== 'string' || typeof name !== 'string') {
      continue
    }
    calls.push({
      arguments: typeof rawArguments === 'string' ? rawArguments : '',
      callId,
      name,
    })
  }
  return calls
}

const parseSseEvent = (eventChunk: string): readonly string[] => {
  const lines = eventChunk.split('\n')
  const dataLines: string[] = []
  for (const line of lines) {
    if (!line.startsWith('data:')) {
      continue
    }
    dataLines.push(line.slice(5).trimStart())
  }
  return dataLines
}

const updateToolCallAccumulator = (
  accumulator: Readonly<Record<number, StreamingToolCall>>,
  chunk: readonly unknown[],
):
  | {
      readonly nextAccumulator: Readonly<Record<number, StreamingToolCall>>
      readonly toolCalls: readonly StreamingToolCall[]
    }
  | undefined => {
  let changed = false
  const nextAccumulator: Record<number, StreamingToolCall> = { ...accumulator }
  for (const item of chunk) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const index = Reflect.get(item, 'index')
    if (typeof index !== 'number') {
      continue
    }
    const current = nextAccumulator[index] || { arguments: '', name: '' }
    const id = Reflect.get(item, 'id')
    const toolFunction = Reflect.get(item, 'function')
    let { name } = current
    let args = current.arguments
    if (toolFunction && typeof toolFunction === 'object') {
      const deltaName = Reflect.get(toolFunction, 'name')
      const deltaArguments = Reflect.get(toolFunction, 'arguments')
      if (typeof deltaName === 'string' && deltaName) {
        name = deltaName
      }
      if (typeof deltaArguments === 'string') {
        args += deltaArguments
      }
    }
    const next: StreamingToolCall = {
      arguments: args,
      ...(typeof id === 'string'
        ? {
            id,
          }
        : current.id
          ? {
              id: current.id,
            }
          : {}),
      name,
    }
    if (JSON.stringify(next) !== JSON.stringify(current)) {
      nextAccumulator[index] = next
      changed = true
    }
  }
  if (!changed) {
    return undefined
  }
  const toolCalls = Object.entries(nextAccumulator)
    .toSorted((a: readonly [string, StreamingToolCall], b: readonly [string, StreamingToolCall]) => Number(a[0]) - Number(b[0]))
    .map((entry: readonly [string, StreamingToolCall]) => entry[1])
    .filter((toolCall) => !!toolCall.name)
  return {
    nextAccumulator,
    toolCalls,
  }
}

const getResponseFunctionCallsFromStreamingAccumulator = (
  toolCallAccumulator: Readonly<Record<string, StreamingToolCall>>,
): readonly ResponseFunctionCall[] => {
  return Object.entries(toolCallAccumulator)
    .toSorted((a: readonly [string, StreamingToolCall], b: readonly [string, StreamingToolCall]) => a[0].localeCompare(b[0]))
    .map((entry: readonly [string, StreamingToolCall]) => entry[1])
    .filter((toolCall) => typeof toolCall.id === 'string' && !!toolCall.id && !!toolCall.name)
    .map((toolCall) => ({
      arguments: toolCall.arguments,
      callId: toolCall.id as string,
      name: toolCall.name,
    }))
}

type ParseOpenApiStreamSuccessResult = {
  readonly responseFunctionCalls: readonly ResponseFunctionCall[]
  readonly responseId?: string
  readonly text: string
  readonly type: 'success'
}

type ParseOpenApiStreamResult = ParseOpenApiStreamSuccessResult | GetOpenApiAssistantTextErrorResult

const getStreamingToolCallKey = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const outputIndex = Reflect.get(value, 'output_index')
  if (typeof outputIndex === 'number') {
    return String(outputIndex)
  }
  if (typeof outputIndex === 'string' && outputIndex) {
    return outputIndex
  }
  const itemId = Reflect.get(value, 'item_id')
  if (typeof itemId === 'string' && itemId) {
    return itemId
  }
  return undefined
}

const parseOpenApiStream = async (
  response: Response,
  onTextChunk?: (chunk: string) => Promise<void>,
  onToolCallsChunk?: (toolCalls: readonly StreamingToolCall[]) => Promise<void>,
  onDataEvent?: (value: unknown) => Promise<void>,
): Promise<ParseOpenApiStreamResult> => {
  if (!response.body) {
    return {
      details: 'request-failed',
      type: 'error',
    }
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let remainder = ''
  let text = ''
  let done = false
  let toolCallAccumulator: Readonly<Record<string, StreamingToolCall>> = {}
  let responseId: string | undefined
  let completedResponseFunctionCalls: readonly ResponseFunctionCall[] = []

  const emitToolCallAccumulator = async (): Promise<void> => {
    if (!onToolCallsChunk) {
      return
    }
    const toolCalls = Object.entries(toolCallAccumulator)
      .toSorted((a: readonly [string, StreamingToolCall], b: readonly [string, StreamingToolCall]) => a[0].localeCompare(b[0]))
      .map((entry: readonly [string, StreamingToolCall]) => entry[1])
      .filter((toolCall) => !!toolCall.name)
    if (toolCalls.length === 0) {
      return
    }
    await onToolCallsChunk(toolCalls)
  }

  const handleParsedStreamEvent = async (parsed: unknown): Promise<void> => {
    if (onDataEvent) {
      await onDataEvent(parsed)
    }
    if (!parsed || typeof parsed !== 'object') {
      return
    }

    const eventType = Reflect.get(parsed, 'type')
    if (eventType === 'response.completed') {
      const response = Reflect.get(parsed, 'response')
      if (response && typeof response === 'object') {
        const parsedResponseId = Reflect.get(response, 'id')
        if (typeof parsedResponseId === 'string' && parsedResponseId) {
          responseId = parsedResponseId
        }
        completedResponseFunctionCalls = getResponseFunctionCalls(response)
      }
      return
    }

    if (eventType === 'response.created' || eventType === 'response.in_progress') {
      const response = Reflect.get(parsed, 'response')
      if (!response || typeof response !== 'object') {
        return
      }
      const parsedResponseId = Reflect.get(response, 'id')
      if (typeof parsedResponseId === 'string' && parsedResponseId) {
        responseId = parsedResponseId
      }
      return
    }

    if (eventType === 'response.output_text.delta') {
      const delta = Reflect.get(parsed, 'delta')
      if (typeof delta !== 'string' || !delta) {
        return
      }
      text += delta
      if (onTextChunk) {
        await onTextChunk(delta)
      }
      return
    }

    if (eventType === 'response.output_item.added') {
      const toolCallKey = getStreamingToolCallKey(parsed)
      const item = Reflect.get(parsed, 'item')
      if (!toolCallKey || !item || typeof item !== 'object') {
        return
      }
      const itemType = Reflect.get(item, 'type')
      if (itemType !== 'function_call') {
        return
      }
      const callId = Reflect.get(item, 'call_id')
      const name = Reflect.get(item, 'name')
      const rawArguments = Reflect.get(item, 'arguments')
      const next: StreamingToolCall = {
        arguments: typeof rawArguments === 'string' ? rawArguments : '',
        ...(typeof callId === 'string'
          ? {
              id: callId,
            }
          : {}),
        name: typeof name === 'string' ? name : '',
      }
      toolCallAccumulator = {
        ...toolCallAccumulator,
        [toolCallKey]: next,
      }
      await emitToolCallAccumulator()
      return
    }

    if (eventType === 'response.output_item.done') {
      const toolCallKey = getStreamingToolCallKey(parsed)
      const item = Reflect.get(parsed, 'item')
      if (!toolCallKey || !item || typeof item !== 'object') {
        return
      }
      const itemType = Reflect.get(item, 'type')
      if (itemType !== 'function_call') {
        return
      }
      const callId = Reflect.get(item, 'call_id')
      const name = Reflect.get(item, 'name')
      const rawArguments = Reflect.get(item, 'arguments')
      const current = toolCallAccumulator[toolCallKey] || { arguments: '', name: '' }
      toolCallAccumulator = {
        ...toolCallAccumulator,
        [toolCallKey]: {
          arguments: typeof rawArguments === 'string' ? rawArguments : current.arguments,
          ...(typeof callId === 'string'
            ? {
                id: callId,
              }
            : current.id
              ? {
                  id: current.id,
                }
              : {}),
          name: typeof name === 'string' && name ? name : current.name,
        },
      }
      await emitToolCallAccumulator()
      return
    }

    if (eventType === 'response.function_call_arguments.delta' || eventType === 'response.function_call_arguments.done') {
      const toolCallKey = getStreamingToolCallKey(parsed)
      if (!toolCallKey) {
        return
      }
      const current = toolCallAccumulator[toolCallKey] || { arguments: '', name: '' }
      const name = Reflect.get(parsed, 'name')
      const callId = Reflect.get(parsed, 'call_id')
      const delta = Reflect.get(parsed, 'delta')
      const rawArguments = Reflect.get(parsed, 'arguments')
      const next: StreamingToolCall = {
        arguments: typeof rawArguments === 'string' ? rawArguments : typeof delta === 'string' ? `${current.arguments}${delta}` : current.arguments,
        ...(typeof callId === 'string'
          ? {
              id: callId,
            }
          : current.id
            ? {
                id: current.id,
              }
            : {}),
        name: typeof name === 'string' && name ? name : current.name,
      }
      toolCallAccumulator = {
        ...toolCallAccumulator,
        [toolCallKey]: next,
      }
      await emitToolCallAccumulator()
      return
    }

    const choices = Reflect.get(parsed, 'choices')
    if (!Array.isArray(choices)) {
      return
    }
    const firstChoice = choices[0]
    if (!firstChoice || typeof firstChoice !== 'object') {
      return
    }
    const delta = Reflect.get(firstChoice, 'delta')
    if (!delta || typeof delta !== 'object') {
      return
    }
    const toolCalls = Reflect.get(delta, 'tool_calls')
    const updatedToolCallResult = Array.isArray(toolCalls)
      ? updateToolCallAccumulator(toolCallAccumulator, toolCalls as readonly unknown[])
      : undefined
    if (updatedToolCallResult) {
      toolCallAccumulator = updatedToolCallResult.nextAccumulator
    }
    if (updatedToolCallResult && onToolCallsChunk) {
      await onToolCallsChunk(updatedToolCallResult.toolCalls)
    }
    const content = Reflect.get(delta, 'content')
    const chunkText = getStreamChunkText(content)
    if (!chunkText) {
      return
    }
    text += chunkText
    if (onTextChunk) {
      await onTextChunk(chunkText)
    }
  }

  while (!done) {
    const { done: streamDone, value } = await reader.read()
    if (streamDone) {
      done = true
    } else if (value) {
      remainder += decoder.decode(value, { stream: true })
    }

    while (true) {
      const separatorIndex = remainder.indexOf('\n\n')
      if (separatorIndex === -1) {
        break
      }
      const rawEvent = remainder.slice(0, separatorIndex)
      remainder = remainder.slice(separatorIndex + 2)
      const dataLines = parseSseEvent(rawEvent)
      if (dataLines.length === 0) {
        continue
      }
      for (const line of dataLines) {
        if (line === '[DONE]') {
          done = true
          break
        }
        let parsed: unknown
        try {
          parsed = JSON.parse(line) as unknown
        } catch {
          continue
        }
        await handleParsedStreamEvent(parsed)
      }
    }
  }

  if (remainder) {
    const dataLines = parseSseEvent(remainder)
    for (const line of dataLines) {
      if (line === '[DONE]') {
        continue
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(line) as unknown
      } catch {
        continue
      }
      await handleParsedStreamEvent(parsed)
    }
  }

  const responseFunctionCalls =
    completedResponseFunctionCalls.length > 0 ? completedResponseFunctionCalls : getResponseFunctionCallsFromStreamingAccumulator(toolCallAccumulator)
  return {
    ...(responseId
      ? {
          responseId,
        }
      : {}),
    responseFunctionCalls,
    text,
    type: 'success',
  }
}

const getOpenApiErrorDetails = async (
  response: Response,
): Promise<Pick<GetOpenApiAssistantTextErrorResult, 'errorCode' | 'errorMessage' | 'errorType'>> => {
  let parsed: unknown
  try {
    parsed = (await response.json()) as unknown
  } catch {
    return {}
  }

  if (!parsed || typeof parsed !== 'object') {
    return {}
  }

  const error = Reflect.get(parsed, 'error')
  if (!error || typeof error !== 'object') {
    return {}
  }

  const errorCode = Reflect.get(error, 'code')
  const errorMessage = Reflect.get(error, 'message')
  const errorType = Reflect.get(error, 'type')

  return {
    ...(typeof errorCode === 'string'
      ? {
          errorCode,
        }
      : {}),
    ...(typeof errorMessage === 'string'
      ? {
          errorMessage,
        }
      : {}),
    ...(typeof errorType === 'string'
      ? {
          errorType,
        }
      : {}),
  }
}

const getOpenApiErrorDetailsFromResponseText = (
  responseText: string,
): Pick<GetOpenApiAssistantTextErrorResult, 'errorCode' | 'errorMessage' | 'errorType'> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(responseText) as unknown
  } catch {
    return {}
  }

  if (!parsed || typeof parsed !== 'object') {
    return {}
  }

  const error = Reflect.get(parsed, 'error')
  if (!error || typeof error !== 'object') {
    return {}
  }

  const errorCode = Reflect.get(error, 'code')
  const errorMessage = Reflect.get(error, 'message')
  const errorType = Reflect.get(error, 'type')

  return {
    ...(typeof errorCode === 'string'
      ? {
          errorCode,
        }
      : {}),
    ...(typeof errorMessage === 'string'
      ? {
          errorMessage,
        }
      : {}),
    ...(typeof errorType === 'string'
      ? {
          errorType,
        }
      : {}),
  }
}

const getResponseFromSseEvents = (events: readonly unknown[]): Response => {
  const chunks = events.map((event) => {
    const data = typeof event === 'string' ? event : JSON.stringify(event)
    return `data: ${data}\n\n`
  })
  const stream = new ReadableStream<Uint8Array>({
    start(controller): void {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk))
      }
      controller.close()
    },
  })
  return {
    body: stream,
  } as Response
}

export const getOpenApiAssistantText = async (
  messages: readonly ChatMessage[],
  modelId: string,
  openApiApiKey: string,
  openApiApiBaseUrl: string,
  assetDir: string,
  platform: number,
  options?: GetOpenApiAssistantTextOptions,
): Promise<GetOpenApiAssistantTextResult> => {
  const {
    includeObfuscation = false,
    onDataEvent,
    onEventStreamFinished,
    onTextChunk,
    onToolCallsChunk,
    stream,
    useChatNetworkWorkerForRequests = false,
    webSearchEnabled = false,
  } = options ?? { stream: false }
  const openAiInput: any[] = messages.map((message) => ({
    content: message.text,
    role: message.role,
  }))
  const tools = getBasicChatTools()
  const maxToolIterations = 4
  let previousResponseId: string | undefined
  for (let i = 0; i <= maxToolIterations; i++) {
    const postBody = getOpenAiParams(openAiInput, modelId, stream, includeObfuscation, tools, webSearchEnabled, previousResponseId)

    if (stream) {
      const streamResult = useChatNetworkWorkerForRequests
        ? await (async (): Promise<ParseOpenApiStreamResult> => {
            const requestResult = await makeStreamingApiRequest({
              headers: {
                Authorization: `Bearer ${openApiApiKey}`,
                'Content-Type': 'application/json',
                ...getClientRequestIdHeader(),
              },
              method: 'POST',
              postBody,
              url: getOpenApiApiEndpoint(openApiApiBaseUrl),
            })
            if (requestResult.type === 'error') {
              if (requestResult.statusCode === 0) {
                return {
                  details: 'request-failed',
                  type: 'error',
                }
              }
              const { errorCode, errorMessage, errorType } = getOpenApiErrorDetailsFromResponseText(requestResult.response)
              return {
                details: 'http-error',
                ...(errorCode
                  ? {
                      errorCode,
                    }
                  : {}),
                ...(errorMessage
                  ? {
                      errorMessage,
                    }
                  : {}),
                ...(errorType
                  ? {
                      errorType,
                    }
                  : {}),
                statusCode: requestResult.statusCode,
                type: 'error',
              }
            }
            const response = getResponseFromSseEvents(requestResult.body)
            return parseOpenApiStream(response, onTextChunk, onToolCallsChunk, onDataEvent)
          })()
        : await (async (): Promise<ParseOpenApiStreamResult> => {
            let response: Response
            try {
              response = await fetch(getOpenApiApiEndpoint(openApiApiBaseUrl), {
                body: JSON.stringify(postBody),
                headers: {
                  Authorization: `Bearer ${openApiApiKey}`,
                  'Content-Type': 'application/json',
                  ...getClientRequestIdHeader(),
                },
                method: 'POST',
              })
            } catch {
              return {
                details: 'request-failed',
                type: 'error',
              }
            }

            if (!response.ok) {
              const { errorCode, errorMessage, errorType } = await getOpenApiErrorDetails(response)
              return {
                details: 'http-error',
                ...(errorCode
                  ? {
                      errorCode,
                    }
                  : {}),
                ...(errorMessage
                  ? {
                      errorMessage,
                    }
                  : {}),
                ...(errorType
                  ? {
                      errorType,
                    }
                  : {}),
                statusCode: response.status,
                type: 'error',
              }
            }
            return parseOpenApiStream(response, onTextChunk, onToolCallsChunk, onDataEvent)
          })()
      if (streamResult.type !== 'success') {
        return streamResult
      }

      if (streamResult.responseId) {
        previousResponseId = streamResult.responseId
      }

      if (streamResult.responseFunctionCalls.length > 0) {
        openAiInput.length = 0
        const executedToolCalls: StreamingToolCall[] = []
        for (const toolCall of streamResult.responseFunctionCalls) {
          const content = await executeChatTool(toolCall.name, toolCall.arguments, { assetDir, platform })
          const executionStatus = getToolCallExecutionStatus(content)
          executedToolCalls.push({
            arguments: toolCall.arguments,
            ...(executionStatus.errorStack
              ? {
                  errorStack: executionStatus.errorStack,
                }
              : {}),
            ...(executionStatus.errorMessage
              ? {
                  errorMessage: executionStatus.errorMessage,
                }
              : {}),
            ...(executionStatus.errorStack
              ? {
                  errorStack: executionStatus.errorStack,
                }
              : {}),
            id: toolCall.callId,
            name: toolCall.name,
            ...(executionStatus.status
              ? {
                  status: executionStatus.status,
                }
              : {}),
          })
          openAiInput.push({
            call_id: toolCall.callId,
            output: content,
            type: 'function_call_output',
          })
        }
        if (onToolCallsChunk && executedToolCalls.length > 0) {
          await onToolCallsChunk(executedToolCalls)
        }
        continue
      }

      if (onEventStreamFinished) {
        await onEventStreamFinished()
      }

      return {
        text: streamResult.text,
        type: 'success',
      }
    }

    let parsed: unknown
    if (useChatNetworkWorkerForRequests) {
      const requestResult = await makeApiRequest({
        headers: {
          Authorization: `Bearer ${openApiApiKey}`,
          'Content-Type': 'application/json',
          ...getClientRequestIdHeader(),
        },
        method: 'POST',
        postBody,
        url: getOpenApiApiEndpoint(openApiApiBaseUrl),
      })
      if (requestResult.type === 'error') {
        if (requestResult.statusCode === 0) {
          return {
            details: 'request-failed',
            type: 'error',
          }
        }
        const { errorCode, errorMessage, errorType } = getOpenApiErrorDetailsFromResponseText(requestResult.response)
        return {
          details: 'http-error',
          ...(errorCode
            ? {
                errorCode,
              }
            : {}),
          ...(errorMessage
            ? {
                errorMessage,
              }
            : {}),
          ...(errorType
            ? {
                errorType,
              }
            : {}),
          statusCode: requestResult.statusCode,
          type: 'error',
        }
      }
      parsed = requestResult.body
    } else {
      let response: Response
      try {
        response = await fetch(getOpenApiApiEndpoint(openApiApiBaseUrl), {
          body: JSON.stringify(postBody),
          headers: {
            Authorization: `Bearer ${openApiApiKey}`,
            'Content-Type': 'application/json',
            ...getClientRequestIdHeader(),
          },
          method: 'POST',
        })
      } catch {
        return {
          details: 'request-failed',
          type: 'error',
        }
      }

      if (!response.ok) {
        const { errorCode, errorMessage, errorType } = await getOpenApiErrorDetails(response)
        return {
          details: 'http-error',
          ...(errorCode
            ? {
                errorCode,
              }
            : {}),
          ...(errorMessage
            ? {
                errorMessage,
              }
            : {}),
          ...(errorType
            ? {
                errorType,
              }
            : {}),
          statusCode: response.status,
          type: 'error',
        }
      }

      try {
        parsed = (await response.json()) as unknown
      } catch {
        return {
          details: 'request-failed',
          type: 'error',
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        text: '',
        type: 'success',
      }
    }

    const parsedResponseId = Reflect.get(parsed, 'id')
    if (typeof parsedResponseId === 'string' && parsedResponseId) {
      previousResponseId = parsedResponseId
    }

    const responseFunctionCalls = getResponseFunctionCalls(parsed)
    if (responseFunctionCalls.length > 0) {
      openAiInput.length = 0
      const executedToolCalls: StreamingToolCall[] = []
      for (const toolCall of responseFunctionCalls) {
        const content = await executeChatTool(toolCall.name, toolCall.arguments, { assetDir, platform })
        const executionStatus = getToolCallExecutionStatus(content)
        executedToolCalls.push({
          arguments: toolCall.arguments,
          ...(executionStatus.errorStack
            ? {
                errorStack: executionStatus.errorStack,
              }
            : {}),
          ...(executionStatus.errorMessage
            ? {
                errorMessage: executionStatus.errorMessage,
              }
            : {}),
          ...(executionStatus.errorStack
            ? {
                errorStack: executionStatus.errorStack,
              }
            : {}),
          id: toolCall.callId,
          name: toolCall.name,
          ...(executionStatus.status
            ? {
                status: executionStatus.status,
              }
            : {}),
        })
        openAiInput.push({
          call_id: toolCall.callId,
          output: content,
          type: 'function_call_output',
        })
      }
      if (onToolCallsChunk && executedToolCalls.length > 0) {
        await onToolCallsChunk(executedToolCalls)
      }
      continue
    }

    const outputText = getResponseOutputText(parsed)
    if (outputText) {
      return {
        text: outputText,
        type: 'success',
      }
    }

    const choices = Reflect.get(parsed, 'choices')
    if (Array.isArray(choices)) {
      const firstChoice = choices[0]
      if (!firstChoice || typeof firstChoice !== 'object') {
        return {
          text: '',
          type: 'success',
        }
      }
      const message = Reflect.get(firstChoice, 'message')
      if (!message || typeof message !== 'object') {
        return {
          text: '',
          type: 'success',
        }
      }
      const toolCalls = Reflect.get(message, 'tool_calls')
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        openAiInput.length = 0
        const executedToolCalls: StreamingToolCall[] = []
        for (const toolCall of toolCalls) {
          if (!toolCall || typeof toolCall !== 'object') {
            continue
          }
          const id = Reflect.get(toolCall, 'id')
          const toolFunction = Reflect.get(toolCall, 'function')
          if (typeof id !== 'string' || !toolFunction || typeof toolFunction !== 'object') {
            continue
          }
          const name = Reflect.get(toolFunction, 'name')
          const rawArguments = Reflect.get(toolFunction, 'arguments')
          const content = typeof name === 'string' ? await executeChatTool(name, rawArguments, { assetDir, platform }) : '{}'
          if (typeof name === 'string') {
            const executionStatus = getToolCallExecutionStatus(content)
            executedToolCalls.push({
              arguments: typeof rawArguments === 'string' ? rawArguments : '',
              ...(executionStatus.errorStack
                ? {
                    errorStack: executionStatus.errorStack,
                  }
                : {}),
              ...(executionStatus.errorMessage
                ? {
                    errorMessage: executionStatus.errorMessage,
                  }
                : {}),
              ...(executionStatus.errorStack
                ? {
                    errorStack: executionStatus.errorStack,
                  }
                : {}),
              id,
              name,
              ...(executionStatus.status
                ? {
                    status: executionStatus.status,
                  }
                : {}),
            })
          }
          openAiInput.push({
            call_id: id,
            output: content,
            type: 'function_call_output',
          })
        }
        if (onToolCallsChunk && executedToolCalls.length > 0) {
          await onToolCallsChunk(executedToolCalls)
        }
        continue
      }
      const content = Reflect.get(message, 'content')
      return {
        text: getTextContent(content),
        type: 'success',
      }
    }

    return {
      text: '',
      type: 'success',
    }
  }

  return {
    details: 'request-failed',
    type: 'error',
  }
}
