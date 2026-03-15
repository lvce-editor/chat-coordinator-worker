import type { GetOpenApiAssistantTextResult } from '../GetOpenApiAssistantText/GetOpenApiAssistantText.ts'
import type { StreamingToolCall } from '../StreamingToolCall/StreamingToolCall.ts'
import * as MockOpenApiStream from '../MockOpenApiStream/MockOpenApiStream.ts'

type ResponseFunctionCall = {
  readonly arguments: string
  readonly callId: string
  readonly name: string
}

type GetMockOpenApiAssistantTextSuccessResult = {
  readonly responseFunctionCalls: readonly ResponseFunctionCall[]
  readonly responseId?: string
  readonly text: string
  readonly type: 'success'
}

type GetMockOpenApiAssistantTextResult = GetMockOpenApiAssistantTextSuccessResult | Exclude<GetOpenApiAssistantTextResult, { type: 'success' }>

const getResponseFunctionCalls = (value: unknown): readonly ResponseFunctionCall[] => {
  if (!value || typeof value !== 'object') {
    return []
  }
  const output = Reflect.get(value, 'output')
  if (!Array.isArray(output)) {
    return []
  }
  const responseFunctionCalls: ResponseFunctionCall[] = []
  for (const item of output) {
    if (!item || typeof item !== 'object') {
      continue
    }
    if (Reflect.get(item, 'type') !== 'function_call') {
      continue
    }
    const callId = Reflect.get(item, 'call_id')
    const name = Reflect.get(item, 'name')
    const rawArguments = Reflect.get(item, 'arguments')
    if (typeof callId !== 'string' || typeof name !== 'string') {
      continue
    }
    responseFunctionCalls.push({
      arguments: typeof rawArguments === 'string' ? rawArguments : '',
      callId,
      name,
    })
  }
  return responseFunctionCalls
}

const parseSseDataLines = (eventChunk: string): readonly string[] => {
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

const emitToolCalls = async (
  toolCallAccumulator: Readonly<Record<number, StreamingToolCall>>,
  onToolCallsChunk?: (toolCalls: readonly StreamingToolCall[]) => Promise<void>,
): Promise<void> => {
  if (!onToolCallsChunk) {
    return
  }
  const toolCalls = Object.entries(toolCallAccumulator)
    .toSorted((a: readonly [string, StreamingToolCall], b: readonly [string, StreamingToolCall]) => Number(a[0]) - Number(b[0]))
    .map((entry: readonly [string, StreamingToolCall]) => entry[1])
    .filter((toolCall) => !!toolCall.name)
  if (toolCalls.length === 0) {
    return
  }
  await onToolCallsChunk(toolCalls)
}

export const getMockOpenApiAssistantText = async (
  stream: boolean,
  onTextChunk?: (chunk: string) => Promise<void>,
  onToolCallsChunk?: (toolCalls: readonly StreamingToolCall[]) => Promise<void>,
  onDataEvent?: (value: unknown) => Promise<void>,
  onEventStreamFinished?: () => Promise<void>,
): Promise<GetMockOpenApiAssistantTextResult> => {
  const error = MockOpenApiStream.takeErrorResponse()
  if (error) {
    return error
  }

  let text = ''
  let remainder = ''
  let toolCallAccumulator: Readonly<Record<number, StreamingToolCall>> = {}
  let responseFunctionCalls: readonly ResponseFunctionCall[] = []
  let responseId: string | undefined
  let requestDone = false
  let finishedNotified = false

  const notifyFinished = async (): Promise<void> => {
    if (finishedNotified) {
      return
    }
    finishedNotified = true
    if (onEventStreamFinished) {
      await onEventStreamFinished()
    }
  }

  const handleParsedSseEvent = async (parsed: unknown): Promise<void> => {
    if (onDataEvent) {
      await onDataEvent(parsed)
    }
    if (!parsed || typeof parsed !== 'object') {
      return
    }
    const eventType = Reflect.get(parsed, 'type')
    if (eventType === 'response.completed') {
      const response = Reflect.get(parsed, 'response')
      responseFunctionCalls = getResponseFunctionCalls(response)
      const parsedResponseId = response && typeof response === 'object' ? Reflect.get(response, 'id') : undefined
      if (typeof parsedResponseId === 'string' && parsedResponseId) {
        responseId = parsedResponseId
      }
      requestDone = true
      await notifyFinished()
      return
    }
    if (eventType === 'response.output_text.delta') {
      const delta = Reflect.get(parsed, 'delta')
      if (typeof delta !== 'string' || !delta) {
        return
      }
      text += delta
      if (stream && onTextChunk) {
        await onTextChunk(delta)
      }
      return
    }
    if (eventType === 'response.output_item.added') {
      const outputIndex = Reflect.get(parsed, 'output_index')
      const item = Reflect.get(parsed, 'item')
      if (typeof outputIndex !== 'number' || !item || typeof item !== 'object') {
        return
      }
      if (Reflect.get(item, 'type') !== 'function_call') {
        return
      }
      const name = Reflect.get(item, 'name')
      const argumentsValue = Reflect.get(item, 'arguments')
      const callId = Reflect.get(item, 'call_id')
      toolCallAccumulator = {
        ...toolCallAccumulator,
        [outputIndex]: {
          arguments: typeof argumentsValue === 'string' ? argumentsValue : '',
          ...(typeof callId === 'string'
            ? {
                id: callId,
              }
            : {}),
          name: typeof name === 'string' ? name : '',
        },
      }
      await emitToolCalls(toolCallAccumulator, onToolCallsChunk)
      return
    }
    if (eventType === 'response.function_call_arguments.delta' || eventType === 'response.function_call_arguments.done') {
      const outputIndex = Reflect.get(parsed, 'output_index')
      if (typeof outputIndex !== 'number') {
        return
      }
      const current = toolCallAccumulator[outputIndex] || { arguments: '', name: '' }
      const delta = Reflect.get(parsed, 'delta')
      const argumentsValue = Reflect.get(parsed, 'arguments')
      const name = Reflect.get(parsed, 'name')
      const callId = Reflect.get(parsed, 'call_id')
      const next: StreamingToolCall = {
        arguments:
          typeof argumentsValue === 'string' ? argumentsValue : typeof delta === 'string' ? `${current.arguments}${delta}` : current.arguments,
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
        [outputIndex]: next,
      }
      await emitToolCalls(toolCallAccumulator, onToolCallsChunk)
    }
  }

  const consumeSseDataLines = async (dataLines: readonly string[]): Promise<void> => {
    for (const line of dataLines) {
      if (line === '[DONE]') {
        requestDone = true
        await notifyFinished()
        break
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(line) as unknown
      } catch {
        continue
      }
      await handleParsedSseEvent(parsed)
      if (requestDone) {
        break
      }
    }
  }

  while (!requestDone) {
    const chunk = await MockOpenApiStream.readNextChunk()
    if (typeof chunk !== 'string') {
      break
    }
    if (chunk.startsWith('data:')) {
      remainder += chunk
      while (true) {
        const separatorIndex = remainder.indexOf('\n\n')
        if (separatorIndex === -1) {
          break
        }
        const rawEvent = remainder.slice(0, separatorIndex)
        remainder = remainder.slice(separatorIndex + 2)
        const dataLines = parseSseDataLines(rawEvent)
        await consumeSseDataLines(dataLines)
        if (requestDone) {
          break
        }
      }
      continue
    }
    text += chunk
    if (stream && onTextChunk) {
      await onTextChunk(chunk)
    }
  }

  if (!requestDone && remainder) {
    const dataLines = parseSseDataLines(remainder)
    await consumeSseDataLines(dataLines)
  }

  await notifyFinished()

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
