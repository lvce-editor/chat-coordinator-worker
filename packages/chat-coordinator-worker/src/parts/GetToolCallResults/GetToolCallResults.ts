import { PlatformType } from '@lvce-editor/constants'
import { ChatToolWorker } from '@lvce-editor/rpc-registry'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => {
  return !!value && typeof value === 'object'
}

const isAbsoluteUri = (value: string): boolean => {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)
}

const isWindowsPath = (value: string): boolean => {
  return /^[a-zA-Z]:[\\/]/.test(value)
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

const normalizeToolName = (name: string): string => {
  switch (name) {
    case 'get_workspace_uri':
      return 'getWorkspaceUri'
    case 'open_editor':
      return 'openEditor'
    default:
      return name
  }
}

const toAbsoluteUri = (value: string): string => {
  if (!value) {
    return value
  }
  if (isAbsoluteUri(value)) {
    return value
  }
  if (value.startsWith('/')) {
    return new URL(value, 'file://').toString()
  }
  if (isWindowsPath(value)) {
    return `file:///${encodeURI(value.replace(/\\/g, '/'))}`
  }
  return value
}

const normalizeUriArgument = (
  args: Readonly<Record<string, unknown>>,
  targetKey: string,
  fallbackKey: string,
): Readonly<Record<string, unknown>> => {
  const targetValue = typeof args[targetKey] === 'string' ? args[targetKey] : ''
  if (targetValue) {
    return {
      ...args,
      [targetKey]: toAbsoluteUri(targetValue),
    }
  }
  const fallbackValue = typeof args[fallbackKey] === 'string' ? args[fallbackKey] : ''
  if (!fallbackValue) {
    return args
  }
  return {
    ...args,
    [targetKey]: toAbsoluteUri(fallbackValue),
  }
}

const normalizeToolArgs = (name: string, args: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> => {
  switch (name) {
    case 'create_directory':
    case 'edit_file':
    case 'list_files':
    case 'open_preview':
    case 'openEditor':
    case 'read_file':
    case 'write_file':
      return normalizeUriArgument(args, 'uri', 'path')
    case 'glob':
      return normalizeUriArgument(args, 'baseUri', 'basePath')
    case 'rename': {
      const withOldUri = normalizeUriArgument(args, 'oldUri', 'oldPath')
      return normalizeUriArgument(withOldUri, 'newUri', 'newPath')
    }
    default:
      return args
  }
}

const serializeToolArguments = (name: string, args: unknown): string => {
  const normalizedArgs = normalizeToolArgs(name, isRecord(args) ? args : {})
  const serialized = JSON.stringify(normalizedArgs)
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
  const normalizedToolName = normalizeToolName(toolCall.name)
  const rawArguments = serializeToolArguments(normalizedToolName, toolCall.args)
  return ChatToolWorker.execute(normalizedToolName, rawArguments, defaultToolOptions)
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
