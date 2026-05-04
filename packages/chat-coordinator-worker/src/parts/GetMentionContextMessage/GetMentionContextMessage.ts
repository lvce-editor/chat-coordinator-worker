import { RendererWorker } from '@lvce-editor/rpc-registry'
import type { ChatMessage } from '../ChatMessage/ChatMessage.ts'
import { parseMentionedPaths } from '../ParseMentionedPaths/ParseMentionedPaths.ts'

const maxMentionTextLength = 8000

export const getMentionContextMessage = async (value: string): Promise<ChatMessage | undefined> => {
  const paths = parseMentionedPaths(value)
  if (paths.length === 0) {
    return undefined
  }
  const sections: string[] = []
  for (const path of paths) {
    try {
      const fileContent = await RendererWorker.readFile(path)
      const truncatedContent =
        fileContent.length > maxMentionTextLength ? `${fileContent.slice(0, maxMentionTextLength)}\n... [truncated]` : fileContent
      sections.push([`File: ${path}`, '```text', truncatedContent, '```'].join('\n'))
    } catch (error) {
      sections.push([`File: ${path}`, `Error: ${String(error)}`].join('\n'))
    }
  }
  return {
    id: crypto.randomUUID(),
    role: 'user',
    text: ['Referenced file context:', ...sections].join('\n\n'),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}
