interface ToolCallSuccessResult {
  type: 'success'
  value: any
}

interface ToolCallErrorResult {
  error: any
  type: 'error'
}

export type ToolCallResult = ToolCallSuccessResult | ToolCallErrorResult
