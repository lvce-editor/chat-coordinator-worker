import type { ComposerAttachmentDisplayType } from '../ComposerAttachment/ComposerAttachment.ts'
import { isImageFile } from './IsImageFile/IsImageFile.ts'
import { isTextFile } from './IsTextFile/IsTextFile.ts'
import { isValidImage } from './IsValidImage/IsValidImage.ts'

export const getComposerAttachmentDisplayType = async (blob: Blob, name: string, mimeType: string): Promise<ComposerAttachmentDisplayType> => {
  if (isImageFile(mimeType)) {
    return (await isValidImage(blob, mimeType)) ? 'image' : 'invalid-image'
  }
  if (isTextFile(name, mimeType)) {
    return 'text-file'
  }
  return 'file'
}
