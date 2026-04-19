import type { ChatAttachmentAddedEvent, ChatAttachmentRemovedEvent, ChatViewEvent } from '../ChatViewEvent/ChatViewEvent.ts'
import type { ComposerAttachment } from '../ComposerAttachment/ComposerAttachment.ts'
import { getChatViewEvents } from '../ChatSessionStorage/ChatSessionStorage.ts'
import { getComposerAttachmentDisplayType } from '../GetComposerAttachmentDisplayType/GetComposerAttachmentDisplayType.ts'
import { getComposerAttachmentPreviewSrc } from '../GetComposerAttachmentPreviewSrc/GetComposerAttachmentPreviewSrc.ts'
import { getComposerAttachmentTextContent } from '../GetComposerAttachmentTextContent/GetComposerAttachmentTextContent.ts'

const isChatAttachmentAddedEvent = (event: ChatViewEvent): event is ChatAttachmentAddedEvent => {
  return event.type === 'chat-attachment-added'
}

const isChatAttachmentRemovedEvent = (event: ChatViewEvent): event is ChatAttachmentRemovedEvent => {
  return event.type === 'chat-attachment-removed'
}

export const getComposerAttachments = async (sessionId: string): Promise<readonly ComposerAttachment[]> => {
  if (!sessionId) {
    return []
  }
  const events = await getChatViewEvents(sessionId)
  const attachments = new Map<string, ComposerAttachment>()
  for (const event of events) {
    if (isChatAttachmentRemovedEvent(event)) {
      attachments.delete(event.attachmentId)
      continue
    }
    if (!isChatAttachmentAddedEvent(event)) {
      continue
    }
    const displayType = await getComposerAttachmentDisplayType(event.blob, event.name, event.mimeType)
    const [previewSrc, textContent] = await Promise.all([
      getComposerAttachmentPreviewSrc(event.blob, displayType, event.mimeType),
      getComposerAttachmentTextContent(event.blob, displayType),
    ])
    attachments.set(event.attachmentId, {
      attachmentId: event.attachmentId,
      displayType,
      mimeType: event.mimeType,
      name: event.name,
      ...(previewSrc
        ? {
            previewSrc,
          }
        : {}),
      size: event.size,
      ...(typeof textContent === 'string'
        ? {
            textContent,
          }
        : {}),
    })
  }
  return [...attachments.values()]
}
