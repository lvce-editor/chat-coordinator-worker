import type { ExecuteToolOptions } from '../Types/Types.ts'
import { executeGetWorkspaceUriTool } from '../ExecuteGetWorkspaceUriTool/ExecuteGetWorkspaceUriTool.ts'
import { executeListFilesTool } from '../ExecuteListFilesTool/ExecuteListFilesTool.ts'
import { executeReadFileTool } from '../ExecuteReadFileTool/ExecuteReadFileTool.ts'
import { executeRenderHtmlTool } from '../ExecuteRenderHtmlTool/ExecuteRenderHtmlTool.ts'
import { executeWriteFileTool } from '../ExecuteWriteFileTool/ExecuteWriteFileTool.ts'
import { parseToolArguments } from '../ParseToolArguments/ParseToolArguments.ts'

export const executeChatTool = async (name: string, rawArguments: unknown, options: ExecuteToolOptions): Promise<string> => {
  const args = parseToolArguments(rawArguments)
  switch (name) {
    case 'read_file':
      return executeReadFileTool(args, options)
    case 'write_file':
      return executeWriteFileTool(args, options)
    case 'list_files':
      return executeListFilesTool(args, options)
    case 'getWorkspaceUri':
      return executeGetWorkspaceUriTool(args, options)
    case 'render_html':
      return executeRenderHtmlTool(args, options)
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}
