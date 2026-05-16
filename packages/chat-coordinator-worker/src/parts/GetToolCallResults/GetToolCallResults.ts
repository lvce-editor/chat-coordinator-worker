import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ToolCall } from '../ToolCall/ToolCall.ts'
import type { ToolCallResult } from '../ToolCallResult/ToolCallResult.ts'

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => {
  return !!value && typeof value === 'object'
}

const isAbsoluteUri = (value: string): boolean => {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

const executeReadFile = async (args: Readonly<Record<string, unknown>>): Promise<unknown> => {
  const uri = typeof args.uri === 'string' ? args.uri : ''
  if (uri) {
    const content = await RendererWorker.readFile(uri)
    return {
      content,
      uri,
    }
  }
  const path = typeof args.path === 'string' ? args.path : ''
  if (!path) {
    throw new Error('Missing argument: expected uri or path.')
  }
  const content = await RendererWorker.readFile(path)
  return {
    content,
    path,
  }
}

const executeWriteFile = async (args: Readonly<Record<string, unknown>>): Promise<unknown> => {
  const content = typeof args.content === 'string' ? args.content : ''
  const uri = typeof args.uri === 'string' ? args.uri : ''
  if (uri) {
    await RendererWorker.writeFile(uri, content)
    return {
      ok: true,
      uri,
    }
  }
  const path = typeof args.path === 'string' ? args.path : ''
  if (!path) {
    throw new Error('Missing argument: expected uri or path.')
  }
  await RendererWorker.writeFile(path, content)
  return {
    ok: true,
    path,
  }
}

const executeListFiles = async (args: Readonly<Record<string, unknown>>): Promise<unknown> => {
  const uri = typeof args.uri === 'string' ? args.uri : ''
  if (!uri || !isAbsoluteUri(uri)) {
    throw new Error('Invalid argument: uri must be an absolute URI.')
  }
  const entries = await RendererWorker.invoke('FileSystem.readDirWithFileTypes', uri)
  return {
    entries,
    uri,
  }
}

const executeGetWorkspaceUri = async (): Promise<unknown> => {
  const workspaceUri = await RendererWorker.getWorkspacePath()
  return {
    workspaceUri,
  }
}

const executeToolCall = async (toolCall: ToolCall<unknown>): Promise<unknown> => {
  const args = isRecord(toolCall.args) ? toolCall.args : {}
  switch (toolCall.name) {
    case 'get_workspace_uri':
    case 'getWorkspaceUri':
      return executeGetWorkspaceUri()
    case 'list_files':
      return executeListFiles(args)
    case 'read_file':
      return executeReadFile(args)
    case 'write_file':
      return executeWriteFile(args)
    default:
      return toolCall.args
  }
}

export const getToolCallResults = async (toolCalls: readonly ToolCall<unknown>[]): Promise<readonly ToolCallResult[]> => {
  return Promise.all(
    toolCalls.map(async (toolCall) => {
      try {
        const value = await executeToolCall(toolCall)
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
