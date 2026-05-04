import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

export const getToolCallResults = async (toolCalls: readonly ToolCall<unknown>[]): Promise<readonly ToolCallResult[]> => {
  return toolCalls.map((toolCall) => ({
    type: 'success',
    value: toolCall.args,
  }))
}
