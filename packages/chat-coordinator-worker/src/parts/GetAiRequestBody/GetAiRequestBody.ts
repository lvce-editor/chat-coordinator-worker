import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

export interface AiRequestTextPart {
  readonly text: string
  readonly type: 'input_text'
}

export interface AiRequestFunctionCall {
  readonly arguments: string
  readonly call_id: string
  readonly name: string
  readonly type: 'function_call'
}

export interface AiRequestImagePart {
  readonly image_url: string
  readonly type: 'input_image'
}

export type AiRequestPart = AiRequestImagePart | AiRequestTextPart

export interface AiRequestMessageInput {
  readonly content: string | readonly AiRequestPart[]
  readonly role: 'assistant' | 'system' | 'user'
}

export interface AiRequestFunctionCallOutput {
  readonly call_id: string
  readonly output: string
  readonly type: 'function_call_output'
}

export type AiRequestInput = AiRequestFunctionCall | AiRequestFunctionCallOutput | AiRequestMessageInput

const isAiRequestInput = (value: unknown): value is AiRequestInput => {
  return !!value && typeof value === 'object' && (('content' in value && 'role' in value) || 'call_id' in value)
}

const serializeToolCallOutput = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return JSON.stringify(value)
  }
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (value === undefined) {
    return 'null'
  }
  if (typeof value === 'symbol') {
    return value.description ? `Symbol(${value.description})` : 'Symbol()'
  }
  if (typeof value === 'function') {
    return '[function]'
  }
  const serialized = JSON.stringify(value)
  if (typeof serialized === 'string') {
    return serialized
  }
  return '[unserializable]'
}

const getToolCallOutput = (toolCallResult: ToolCallResult): string => {
  if (toolCallResult.type === 'success') {
    return serializeToolCallOutput(toolCallResult.value)
  }
  return serializeToolCallOutput({ error: toolCallResult.error })
}

export const getAiRequestBody = (
  systemPrompt: string,
  text: string | readonly string[] | readonly AiRequestInput[],
  toolCallResults: readonly ToolCallResult[] = [],
): Readonly<{ input: readonly AiRequestInput[] }> => {
  const messages =
    typeof text === 'string'
      ? [
          {
            content: text,
            role: 'user' as const,
          },
        ]
      : text.map((message) =>
          isAiRequestInput(message)
            ? message
            : {
                content: message,
                role: 'user' as const,
              },
        )
  const outputs = toolCallResults.map((toolCallResult) => ({
    call_id: toolCallResult.callId,
    output: getToolCallOutput(toolCallResult),
    type: 'function_call_output' as const,
  }))
  return {
    input: [
      {
        content: systemPrompt,
        role: 'system',
      },
      ...messages,
      ...outputs,
    ],
  }
}
