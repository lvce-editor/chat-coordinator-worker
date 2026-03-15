import type { ExecuteToolOptions } from '../Types/Types.ts'
import { executeGetWorkspaceUriTool } from '../ExecuteGetWorkspaceUriTool/ExecuteGetWorkspaceUriTool.ts'
import { executeListFilesTool } from '../ExecuteListFilesTool/ExecuteListFilesTool.ts'
import { executeReadFileTool } from '../ExecuteReadFileTool/ExecuteReadFileTool.ts'
import { executeRenderHtmlTool } from '../ExecuteRenderHtmlTool/ExecuteRenderHtmlTool.ts'
import { executeWriteFileTool } from '../ExecuteWriteFileTool/ExecuteWriteFileTool.ts'
import { parseToolArguments } from '../ParseToolArguments/ParseToolArguments.ts'

export const executeChatTool = async (name: string, rawArguments: unknown, options: ExecuteToolOptions): Promise<string> => {
  const args = parseToolArguments(rawArguments)
  if (name === 'read_file') {
    return executeReadFileTool(args, options)
  }

  if (name === 'write_file') {
    return executeWriteFileTool(args, options)
  }

  if (name === 'list_files') {
    return executeListFilesTool(args, options)
  }

  if (name === 'getWorkspaceUri') {
    return executeGetWorkspaceUriTool(args, options)
  }

  if (name === 'render_html') {
    return executeRenderHtmlTool(args, options)
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` })
}
