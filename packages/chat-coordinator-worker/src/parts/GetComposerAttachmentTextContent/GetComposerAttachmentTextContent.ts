import type { ComposerAttachmentDisplayType } from '../ComposerAttachment/ComposerAttachment.ts'

export const getComposerAttachmentTextContent = async (blob: Blob, displayType: ComposerAttachmentDisplayType): Promise<string | undefined> => {
  if (displayType !== 'text-file') {
    return undefined
  }
  return blob.text()
}
