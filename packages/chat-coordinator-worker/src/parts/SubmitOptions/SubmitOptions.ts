export type SubmitAttachmentDisplayType = 'file' | 'image' | 'invalid-image' | 'text-file'

export interface SubmitAttachment {
  readonly attachmentId: string
  readonly displayType: SubmitAttachmentDisplayType
  readonly mimeType: string
  readonly name: string
  readonly previewSrc?: string
  readonly size: number
  readonly textContent?: string
}

export interface SubmitOptions {
  readonly attachments: readonly SubmitAttachment[]
  readonly authAccessToken?: string
  readonly backendUrl?: string
  readonly id: string
  readonly modelId: string
  readonly openAiKey: string
  readonly requestId: string
  readonly role: 'user' | 'assistant'
  readonly sessionId: string
  readonly systemPrompt: string
  readonly text: string
  readonly useOwnBackend?: boolean
}
