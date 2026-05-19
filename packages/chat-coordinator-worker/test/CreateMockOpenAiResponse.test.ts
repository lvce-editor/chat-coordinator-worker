import { expect, test } from '@jest/globals'
import { createMockOpenAiResponse } from '../src/parts/CreateMockOpenAiResponse/CreateMockOpenAiResponse.ts'

test('createMockOpenAiResponse should create assistant text output from structured text input', () => {
  const result = createMockOpenAiResponse(
    {
      model: 'openai/gpt-4.1-mini',
    },
    JSON.stringify({ text: 'hello from mock response' }),
  )

  expect(result).toMatchObject({
    model: 'openai/gpt-4.1-mini',
    output: [
      {
        content: [
          {
            text: 'hello from mock response',
            type: 'output_text',
          },
        ],
        role: 'assistant',
        type: 'message',
      },
    ],
    status: 'completed',
  })
})

test('createMockOpenAiResponse should create function call output from structured tool call input', () => {
  const result = createMockOpenAiResponse(
    {
      model: 'openai/gpt-4.1-mini',
    },
    JSON.stringify({
      toolCall: {
        arguments: {
          uri: 'file:///workspace/generated-folder',
        },
        name: 'create_directory',
      },
    }),
  )

  expect(result).toMatchObject({
    output: [
      {
        arguments: '{"uri":"file:///workspace/generated-folder"}',
        name: 'create_directory',
        type: 'function_call',
      },
    ],
    status: 'completed',
  })
})
