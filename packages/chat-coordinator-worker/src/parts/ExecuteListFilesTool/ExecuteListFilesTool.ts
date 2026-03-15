import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExecuteToolOptions } from '../Types/Types.ts'
import { getToolErrorPayload } from '../GetToolErrorPayload/GetToolErrorPayload.ts'

const isAbsoluteUri = (value: string): boolean => {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)
}

export const executeListFilesTool = async (args: Readonly<Record<string, unknown>>, _options: ExecuteToolOptions): Promise<string> => {
  const uri = typeof args.uri === 'string' ? args.uri : ''
  if (!uri || !isAbsoluteUri(uri)) {
    return JSON.stringify({ error: 'Invalid argument: uri must be an absolute URI.' })
  }
  try {
    const entries = await RendererWorker.invoke('FileSystem.readDirWithFileTypes', uri)
    return JSON.stringify({ entries, uri })
  } catch (error) {
    return JSON.stringify({ ...getToolErrorPayload(error), uri })
  }
}
