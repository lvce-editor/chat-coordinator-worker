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
        content: [
          {
            text: 'Hello world',
            type: 'input_text',
          },
        ],
        role: 'user',
      },
      {
        content: [
          {
            text: 'Hi there',
            type: 'input_text',
          },
        ],
        role: 'assistant',
      },
      {
        content: [
          {
            text: 'Follow up question',
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
            text: 'Hello world',
            type: 'input_text',
          },
        ],
        role: 'user',
      },
      {
        content: [
          {
            text: 'Hi there',
            type: 'input_text',
          },
        ],
        role: 'assistant',
      },
      {
        content: [
          {
            text: 'Follow up question',
            type: 'input_text',
          },
        ],
        role: 'user',
      },
    ],
  })
})

test('getAiRequestBody preserves multi-turn structured history exactly', () => {
  expect(
    getAiRequestBody('You are a helpful assistant.', [
      {
        content: [
          {
            text: 'user 1',
            type: 'input_text',
          },
        ],
        role: 'user',
      },
      {
        content: [
          {
            text: 'assistant 1',
            type: 'input_text',
          },
        ],
        role: 'assistant',
      },
      {
        content: [
          {
            text: 'user 2',
            type: 'input_text',
          },
        ],
        role: 'user',
      },
      {
        content: [
          {
            text: 'assistant 2',
            type: 'input_text',
          },
        ],
        role: 'assistant',
      },
      {
        content: [
          {
            text: 'user 3',
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
            text: 'user 1',
            type: 'input_text',
          },
        ],
        role: 'user',
      },
      {
        content: [
          {
            text: 'assistant 1',
            type: 'input_text',
          },
        ],
        role: 'assistant',
      },
      {
        content: [
          {
            text: 'user 2',
            type: 'input_text',
          },
        ],
        role: 'user',
      },
      {
        content: [
          {
            text: 'assistant 2',
            type: 'input_text',
          },
        ],
        role: 'assistant',
      },
      {
        content: [
          {
            text: 'user 3',
            type: 'input_text',
          },
        ],
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

test('getAiRequestBody appends function_call_output items for tool call results', () => {
  expect(
    getAiRequestBody(
      'You are a helpful assistant.',
      [
        {
          content: 'Hello world',
          role: 'user',
        },
      ],
      [
        {
          callId: 'tool_1',
          type: 'success',
          value: {
            content: 'alpha\nbeta\ngamma',
            uri: 'file:///workspace/notes.txt',
          },
        },
        {
          callId: 'tool_2',
          error: 'Unknown tool: invalid_tool',
          type: 'error',
        },
      ],
    ),
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
        call_id: 'tool_1',
        output: '{"content":"alpha\\nbeta\\ngamma","uri":"file:///workspace/notes.txt"}',
        type: 'function_call_output',
      },
      {
        call_id: 'tool_2',
        output: '{"error":"Unknown tool: invalid_tool"}',
        type: 'function_call_output',
      },
    ],
  })
})
