import { PlatformType } from '@lvce-editor/constants'
import { ChatToolWorker } from '@lvce-editor/rpc-registry'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

interface GetToolCallResultsOptions {
  readonly onToolCallFinished?: (toolCall: ToolCall<unknown>, result: ToolCallResult) => Promise<void> | void
  readonly onToolCallStarted?: (toolCall: ToolCall<unknown>) => Promise<void> | void
}

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

const serializeToolArguments = (args: unknown): string => {
  const serialized = JSON.stringify(args)
  if (typeof serialized === 'string') {
    return serialized
  }
  return '{}'
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
  const rawArguments = serializeToolArguments(toolCall.args)
  return ChatToolWorker.execute(toolCall.name, rawArguments, defaultToolOptions)
}

export const getToolCallResults = async (
  toolCalls: readonly ToolCall<unknown>[],
  options: GetToolCallResultsOptions = {},
): Promise<readonly ToolCallResult[]> => {
  const { onToolCallFinished, onToolCallStarted } = options
  return Promise.all(
    toolCalls.map(async (toolCall) => {
      await onToolCallStarted?.(toolCall)
      let result: ToolCallResult
      try {
        const value = await executeToolCall(toolCall)
        const error = getToolResponseError(value)
        if (error) {
          result = {
            callId: toolCall.id,
            error,
            type: 'error' as const,
          }
        } else {
          result = {
            callId: toolCall.id,
            type: 'success' as const,
            value,
          }
        }
      } catch (error) {
        result = {
          callId: toolCall.id,
          error: getErrorMessage(error),
          type: 'error' as const,
        }
      }
      await onToolCallFinished?.(toolCall, result)
      return result
    }),
  )
}
