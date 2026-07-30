interface AiLoopSuccessResult {
  readonly type: 'success'
}

interface AiLoopRescheduleResult {
  readonly type: 'reschedule'
}

interface AiLoopErrorResult {
  readonly error: Error
  readonly type: 'error'
}

export type AiLoopResult = AiLoopSuccessResult | AiLoopRescheduleResult | AiLoopErrorResult
