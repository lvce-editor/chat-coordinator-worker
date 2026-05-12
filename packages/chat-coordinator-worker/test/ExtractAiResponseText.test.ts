// cspell:ignore logprobs

import { expect, test } from '@jest/globals'
import { extractAiResponse } from '../src/parts/ExtractAiResponseText/ExtractAiResponseText.ts'

test('extractAiResponse reads assistant text from output content when output_text is absent', () => {
  expect(
    extractAiResponse({
      output: [
        {
          content: [
            {
              annotations: [],
              logprobs: [],
              text: 'Hello',
              type: 'output_text',
            },
            {
              annotations: [],
              logprobs: [],
              text: ' world',
              type: 'output_text',
            },
          ],
          id: 'msg_1',
          role: 'assistant',
          status: 'completed',
          type: 'message',
        },
      ],
      status: 'completed',
    }),
  ).toEqual({
    newToolCalls: [],
    text: 'Hello world',
  })
})

test('extractAiResponse preserves function call name and id', () => {
  expect(
    extractAiResponse({
      output: [
        {
          arguments: '{"uri":"file:///workspace/notes.txt","content":"alpha\\nbeta\\ngamma"}',
          call_id: 'call_1',
          name: 'write_file',
          type: 'function_call',
        },
      ],
    }),
  ).toEqual({
    newToolCalls: [
      {
        args: {
          content: 'alpha\nbeta\ngamma',
          uri: 'file:///workspace/notes.txt',
        },
        id: 'call_1',
        name: 'write_file',
      },
    ],
    text: undefined,
  })
})
