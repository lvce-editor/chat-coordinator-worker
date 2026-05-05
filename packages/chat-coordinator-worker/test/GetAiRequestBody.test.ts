import { expect, test } from '@jest/globals'
import { getAiRequestBody } from '../src/parts/GetAiRequestBody/GetAiRequestBody.ts'

const imageAttachment = {
  attachmentId: 'attachment-1',
  displayType: 'image',
  mimeType: 'image/svg+xml',
  name: 'photo.svg',
  previewSrc: 'data:image/svg+xml;base64,PHN2Zw==',
  size: 67,
} as const

const textFileAttachment = {
  attachmentId: 'attachment-2',
  displayType: 'text-file',
  mimeType: 'text/plain',
  name: 'notes.txt',
  size: 20,
  textContent: 'hello from text file',
} as const

test('getAiRequestBody includes the system prompt and submit text', () => {
  expect(getAiRequestBody('You are a helpful assistant.', 'Hello world')).toEqual({
    input: [
      {
        content: 'You are a helpful assistant.',
        role: 'system',
      },
      {
        content: 'Hello world',
        role: 'user',
      },
    ],
  })
})

test('getAiRequestBody includes all stored submit texts', () => {
  expect(getAiRequestBody('You are a helpful assistant.', ['Hello world', 'Follow up question'])).toEqual({
    input: [
      {
        content: 'You are a helpful assistant.',
        role: 'system',
      },
      {
        content: 'Hello world',
        role: 'user',
      },
      {
        content: 'Follow up question',
        role: 'user',
      },
    ],
  })
})

test('getAiRequestBody preserves stored assistant messages', () => {
  expect(
    getAiRequestBody('You are a helpful assistant.', [
      {
        content: 'Hello world',
        role: 'user',
      },
      {
        content: 'Hi there',
        role: 'assistant',
      },
      {
        content: 'Follow up question',
        role: 'user',
      },
    ]),
  ).toEqual({
    input: [
      {
        content: 'You are a helpful assistant.',
        role: 'system',
      },
      {
        content: 'Hello world',
        role: 'user',
      },
      {
        content: 'Hi there',
        role: 'assistant',
      },
      {
        content: 'Follow up question',
        role: 'user',
      },
    ],
  })
})

test('getAiRequestBody preserves attachment-aware user content', () => {
  expect(
    getAiRequestBody('You are a helpful assistant.', [
      {
        content: [
          {
            text: 'Please review the attachments',
            type: 'input_text',
          },
          {
            image_url: imageAttachment.previewSrc,
            type: 'input_image',
          },
          {
            text: 'Attached text file "notes.txt" (text/plain):\n\nhello from text file',
            type: 'input_text',
          },
        ],
        role: 'user',
      },
    ]),
  ).toEqual({
    input: [
      {
        content: 'You are a helpful assistant.',
        role: 'system',
      },
      {
        content: [
          {
            text: 'Please review the attachments',
            type: 'input_text',
          },
          {
            image_url: imageAttachment.previewSrc,
            type: 'input_image',
          },
          {
            text: 'Attached text file "notes.txt" (text/plain):\n\nhello from text file',
            type: 'input_text',
          },
        ],
        role: 'user',
      },
    ],
  })
})
