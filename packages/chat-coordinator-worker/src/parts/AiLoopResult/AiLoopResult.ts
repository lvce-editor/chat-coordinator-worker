export interface AiLoopSuccessResult {
  readonly type: 'success'
}

export interface AiLoopErrorResult {
  readonly error: Error
  readonly type: 'error'
}

export type AiLoopResult = AiLoopSuccessResult | AiLoopErrorResult
