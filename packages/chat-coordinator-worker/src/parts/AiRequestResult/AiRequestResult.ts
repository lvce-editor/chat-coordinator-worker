import type { ToolCall } from '../ToolCall/ToolCall.ts'

type AiRequestSuccessResult = {
  readonly data: any
  readonly headers: Readonly<Record<string, string>>
  readonly statusCode: number
  readonly type: 'success'
  readonly toolCalls: readonly ToolCall<any>[]
}

type AiRequestErrorResult = {
  readonly error: any
  readonly statusCode: number
  readonly type: 'error'
}

export type AiRequestResult = AiRequestSuccessResult | AiRequestErrorResult
