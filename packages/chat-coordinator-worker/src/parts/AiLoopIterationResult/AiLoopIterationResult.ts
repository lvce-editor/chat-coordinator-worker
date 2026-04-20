import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

interface AiLoopIterationSuccessResult {
  readonly data: any
  readonly toolCalls: readonly ToolCall<unknown>[]
  readonly toolCallResults: readonly ToolCallResult[]
  readonly type: 'success'
}

interface AiLoopIterationErrorResult {
  readonly error: Error
  readonly type: 'error'
}

export type AiLoopIterationResult = AiLoopIterationSuccessResult | AiLoopIterationErrorResult
