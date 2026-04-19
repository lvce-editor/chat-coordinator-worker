import type { ChatState } from '../ChatState/ChatState.ts'
import { appendChatViewEvent } from '../ChatSessionStorage/ChatSessionStorage.ts'

export const handleRemoveComposerAttachment = async (state: ChatState, attachmentId: string): Promise<ChatState> => {
  const { composerAttachments, selectedSessionId } = state
  const nextComposerAttachments = composerAttachments.filter((attachment) => attachment.attachmentId !== attachmentId)
  if (nextComposerAttachments.length === composerAttachments.length) {
    return state
  }
  if (selectedSessionId) {
    await appendChatViewEvent({
      attachmentId,
      sessionId: selectedSessionId,
      timestamp: new Date().toISOString(),
      type: 'chat-attachment-removed',
    })
  }
  return {
    ...state,
    composerAttachments: nextComposerAttachments,
  }
}
