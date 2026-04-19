import type { ToolCall } from '../ToolCall/ToolCall.ts'

interface AiLoopIterationSuccessResult {
  readonly data: string
  readonly toolCalls: readonly ToolCall<unknown>[]
  readonly type: 'success'
}

interface AiLoopIterationErrorResult {
  readonly error: Error
  readonly type: 'error'
}

export type AiLoopIterationResult = AiLoopIterationSuccessResult | AiLoopIterationErrorResult
