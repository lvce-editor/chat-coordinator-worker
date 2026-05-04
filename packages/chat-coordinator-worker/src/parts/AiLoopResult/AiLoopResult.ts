export interface AiLoopSuccessResult {
  readonly type: 'success'
}

export interface AiLoopRescheduleResult {
  readonly type: 'reschedule'
}

export interface AiLoopErrorResult {
  readonly error: Error
  readonly type: 'error'
}

export type AiLoopResult = AiLoopSuccessResult | AiLoopRescheduleResult | AiLoopErrorResult
