export type ComposerAttachmentDisplayType = 'file' | 'image' | 'invalid-image' | 'text-file'

export interface ComposerAttachment {
  readonly attachmentId: string
  readonly displayType: ComposerAttachmentDisplayType
  readonly mimeType: string
  readonly name: string
  readonly previewSrc?: string
  readonly size: number
  readonly textContent?: string
}
