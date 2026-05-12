import { expect, test } from '@jest/globals'
import { extractAiResponse } from '../src/parts/ExtractAiResponseText/ExtractAiResponseText.ts'

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
