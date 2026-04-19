import type { ComposerAttachmentDisplayType } from '../ComposerAttachment/ComposerAttachment.ts'
import { getBlobBase64 } from '../GetBlobBase64/GetBlobBase64.ts'

export const getComposerAttachmentPreviewSrc = async (
  blob: Blob,
  displayType: ComposerAttachmentDisplayType,
  mimeType: string,
): Promise<string | undefined> => {
  if (displayType !== 'image') {
    return undefined
  }
  const base64 = await getBlobBase64(blob)
  return `data:${mimeType || 'application/octet-stream'};base64,${base64}`
}
