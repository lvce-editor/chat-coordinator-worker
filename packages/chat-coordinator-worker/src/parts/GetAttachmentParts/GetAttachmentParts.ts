import type { AiRequestImagePart, AiRequestPart, AiRequestTextPart } from '../GetAiRequestBody/GetAiRequestBody.ts'
import type { SubmitAttachment } from '../SubmitOptions/SubmitOptions.ts'

export const getAttachmentTextPart = (attachment: SubmitAttachment): AiRequestTextPart => {
  switch (attachment.displayType) {
    case 'file':
      return {
        text: `Attached file "${attachment.name}" (${attachment.mimeType || 'application/octet-stream'}, ${attachment.size} bytes).`,
        type: 'input_text',
      }
    case 'image':
      return {
        text: `Attached image "${attachment.name}" could not be encoded for the AI request.`,
        type: 'input_text',
      }
    case 'invalid-image':
      return {
        text: `Attached file "${attachment.name}" could not be processed as a valid image.`,
        type: 'input_text',
      }
    case 'text-file':
      return {
        text: attachment.textContent
          ? `Attached text file "${attachment.name}" (${attachment.mimeType || 'text/plain'}):\n\n${attachment.textContent}`
          : `Attached text file "${attachment.name}" (${attachment.mimeType || 'text/plain'}).`,
        type: 'input_text',
      }
  }
}

export const getAttachmentParts = (attachments: readonly SubmitAttachment[]): readonly AiRequestPart[] => {
  const parts: AiRequestPart[] = []
  for (const attachment of attachments) {
    if (attachment.displayType === 'image' && attachment.previewSrc) {
      parts.push({
        image_url: attachment.previewSrc,
        type: 'input_image',
      } satisfies AiRequestImagePart)
      continue
    }
    parts.push(getAttachmentTextPart(attachment))
  }
  return parts
}