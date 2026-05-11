interface ToolCallSuccessResult {
  readonly callId: string
  readonly type: 'success'
  readonly value: any
}

interface ToolCallErrorResult {
  readonly callId: string
  readonly error: any
  readonly type: 'error'
}

export type ToolCallResult = ToolCallSuccessResult | ToolCallErrorResult
