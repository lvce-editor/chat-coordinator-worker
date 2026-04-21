import type { ToolCall } from '../ToolCall/ToolCall.ts'

interface ResponseContentPart {
  readonly text?: string
  readonly type?: string
}

interface ResponseOutputItem {
  readonly arguments?: string
  readonly content?: readonly ResponseContentPart[]
  readonly call_id?: string
  readonly id?: string
  readonly type?: string
}

interface ResponseWithOutputText {
  readonly output?: readonly ResponseOutputItem[]
  readonly output_text?: string | readonly string[]
}

interface ExtractAiResponseResult {
  readonly text: string | undefined
  readonly toolCalls: readonly ToolCall<unknown>[]
}

const getOutputText = (outputText: string | readonly string[] | undefined): string | undefined => {
  if (typeof outputText === 'string') {
    return outputText || undefined
  }
  if (Array.isArray(outputText)) {
    const joinedOutputText = outputText.filter((part): part is string => typeof part === 'string').join('')
    return joinedOutputText || undefined
  }
  return undefined
}

const getOutputItemText = (item: ResponseOutputItem): string => {
  const { content = [] } = item
  return content
    .filter((part): part is ResponseContentPart & { readonly text: string } => typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
}

const getToolCallArgs = (serializedArguments: string): unknown => {
  try {
    return JSON.parse(serializedArguments)
  } catch {
    return serializedArguments
  }
}

const isResponseToolCallItem = (
  item: ResponseOutputItem,
): item is ResponseOutputItem & { readonly arguments: string; readonly call_id?: string; readonly id?: string } => {
  return item.type === 'function_call' && typeof item.arguments === 'string' && (typeof item.call_id === 'string' || typeof item.id === 'string')
}

const getToolCall = (item: ResponseOutputItem): ToolCall<unknown> | undefined => {
  if (!isResponseToolCallItem(item)) {
    return undefined
  }
  return {
    args: getToolCallArgs(item.arguments),
    id: item.call_id || item.id || '',
  }
}

export const extractAiResponse = (data: unknown): ExtractAiResponseResult => {
  if (!data || typeof data !== 'object') {
    return {
      text: undefined,
      toolCalls: [],
    }
  }
  const response = data as ResponseWithOutputText
  const outputText = getOutputText(response.output_text)
  if (outputText) {
    return {
      text: outputText,
      toolCalls: [],
    }
  }
  if (!Array.isArray(response.output)) {
    return {
      text: undefined,
      toolCalls: [],
    }
  }
  const text = response.output.map(getOutputItemText).join('')
  const toolCalls = response.output.map(getToolCall).filter((toolCall): toolCall is ToolCall<unknown> => !!toolCall)
  return {
    text: text || undefined,
    toolCalls,
  }
}

export const extractAiResponseText = (data: unknown): string | undefined => {
  return extractAiResponse(data).text
}
