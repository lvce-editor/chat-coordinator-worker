import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ExecuteToolOptions } from '../Types/Types.ts'
import { getToolErrorPayload } from '../GetToolErrorPayload/GetToolErrorPayload.ts'

export const executeGetWorkspaceUriTool = async (_args: Readonly<Record<string, unknown>>, _options: ExecuteToolOptions): Promise<string> => {
  try {
    const workspaceUri = await RendererWorker.getWorkspacePath()
    return JSON.stringify({ workspaceUri })
  } catch (error) {
    return JSON.stringify(getToolErrorPayload(error))
  }
}
