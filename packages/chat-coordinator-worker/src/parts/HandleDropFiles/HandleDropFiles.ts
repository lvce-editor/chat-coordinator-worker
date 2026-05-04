import type { ChatState } from '../ChatState/ChatState.ts'
import type { ComposerAttachment } from '../ComposerAttachment/ComposerAttachment.ts'
import { appendChatViewEvent } from '../ChatSessionStorage/ChatSessionStorage.ts'
import { getComposerAttachmentDisplayType } from '../GetComposerAttachmentDisplayType/GetComposerAttachmentDisplayType.ts'
import { getComposerAttachmentPreviewSrc } from '../GetComposerAttachmentPreviewSrc/GetComposerAttachmentPreviewSrc.ts'
import { getComposerAttachmentTextContent } from '../GetComposerAttachmentTextContent/GetComposerAttachmentTextContent.ts'
import { getDroppedFiles } from '../GetDroppedFiles/GetDroppedFiles.ts'

export const handleDropFiles = async (state: ChatState, name: string, fileHandles: readonly number[] = []): Promise<ChatState> => {
  const droppedFileHandles = await getDroppedFiles(fileHandles)
  const { composerDropActive, composerDropEnabled, selectedSessionId } = state
  const nextAttachmentId = crypto.randomUUID()
  if (!composerDropEnabled) {
    return {
      ...state,
      composerDropActive: false,
    }
  }
  const nextState =
    composerDropActive === false
      ? state
      : {
          ...state,
          composerDropActive: false,
        }
  if (!selectedSessionId || fileHandles.length === 0) {
    return nextState
  }
  const nextAttachments: ComposerAttachment[] = []
  for (const droppedFileHandle of droppedFileHandles) {
    const file = await droppedFileHandle.getFile()
    const attachmentId = `attachment-${nextAttachmentId + nextAttachments.length}`
    const displayType = await getComposerAttachmentDisplayType(file, file.name, file.type)
    const [previewSrc, textContent] = await Promise.all([
      getComposerAttachmentPreviewSrc(file, displayType, file.type),
      getComposerAttachmentTextContent(file, displayType),
    ])
    await appendChatViewEvent({
      attachmentId,
      blob: file,
      mimeType: file.type,
      name: file.name,
      sessionId: selectedSessionId,
      size: file.size,
      timestamp: new Date().toISOString(),
      type: 'chat-attachment-added',
    })
    nextAttachments.push({
      attachmentId,
      displayType,
      mimeType: file.type,
      name: file.name,
      ...(previewSrc
        ? {
            previewSrc,
          }
        : {}),
      size: file.size,
      ...(typeof textContent === 'string'
        ? {
            textContent,
          }
        : {}),
    })
  }
  return {
    ...nextState,
    composerAttachments: [...nextState.composerAttachments, ...nextAttachments],
  }
}
