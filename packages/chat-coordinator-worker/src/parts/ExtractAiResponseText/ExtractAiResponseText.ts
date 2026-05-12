import type { ToolCall } from '../ToolCall/ToolCall.ts'

interface ResponseContentPart {
  readonly text?: string
  readonly type?: string
}

interface ResponseOutputItem {
  readonly arguments?: string
  readonly call_id?: string
  readonly content?: readonly ResponseContentPart[]
  readonly id?: string
  readonly name?: string
  readonly type?: string
}

interface ResponseWithOutputText {
  readonly output?: readonly ResponseOutputItem[]
  readonly output_text?: string | readonly string[]
}

interface ExtractAiResponseResult {
  readonly newToolCalls: readonly ToolCall<unknown>[]
  readonly text: string | undefined
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
): item is ResponseOutputItem & { readonly arguments: string; readonly call_id?: string; readonly id?: string; readonly name: string } => {
  return (
    item.type === 'function_call' &&
    typeof item.arguments === 'string' &&
    typeof item.name === 'string' &&
    (typeof item.call_id === 'string' || typeof item.id === 'string')
  )
}

const getToolCall = (item: ResponseOutputItem): ToolCall<unknown> | undefined => {
  if (!isResponseToolCallItem(item)) {
    return undefined
  }
  return {
    args: getToolCallArgs(item.arguments),
    id: item.call_id || item.id || '',
    name: item.name,
  }
}

export const extractAiResponse = (data: unknown): ExtractAiResponseResult => {
  if (!data || typeof data !== 'object') {
    return {
      newToolCalls: [],
      text: undefined,
    }
  }
  const response = data as ResponseWithOutputText
  const outputText = getOutputText(response.output_text)
  if (outputText) {
    return {
      newToolCalls: [],
      text: outputText,
    }
  }
  if (!Array.isArray(response.output)) {
    return {
      newToolCalls: [],
      text: undefined,
    }
  }
  const text = response.output.map(getOutputItemText).join('')
  const toolCalls = response.output.map(getToolCall).filter((toolCall): toolCall is ToolCall<unknown> => !!toolCall)
  return {
    newToolCalls: toolCalls,
    text: text || undefined,
  }
}

export const extractAiResponseText = (data: unknown): string | undefined => {
  return extractAiResponse(data).text
}
