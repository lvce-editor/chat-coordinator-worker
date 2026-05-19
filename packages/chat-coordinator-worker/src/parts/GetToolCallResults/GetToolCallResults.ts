import { PlatformType } from '@lvce-editor/constants'
import { ChatToolWorker } from '@lvce-editor/rpc-registry'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => {
  return !!value && typeof value === 'object'
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

const defaultToolOptions = {
  assetDir: '',
  platform: PlatformType.Web,
}

const getToolResponseError = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return undefined
  }
  if (typeof value.error === 'string' && value.error) {
    return value.error
  }
  if (typeof value.errorMessage === 'string' && value.errorMessage) {
    return value.errorMessage
  }
  return undefined
}

const executeToolCall = async (toolCall: ToolCall<unknown>): Promise<unknown> => {
  return ChatToolWorker.execute(toolCall.name, toolCall.args, defaultToolOptions)
}

export const getToolCallResults = async (toolCalls: readonly ToolCall<unknown>[]): Promise<readonly ToolCallResult[]> => {
  return Promise.all(
    toolCalls.map(async (toolCall) => {
      try {
        const value = await executeToolCall(toolCall)
        const error = getToolResponseError(value)
        if (error) {
          return {
            callId: toolCall.id,
            error,
            type: 'error' as const,
          }
        }
        return {
          callId: toolCall.id,
          type: 'success' as const,
          value,
        }
      } catch (error) {
        return {
          callId: toolCall.id,
          error: getErrorMessage(error),
          type: 'error' as const,
        }
      }
    }),
  )
}
