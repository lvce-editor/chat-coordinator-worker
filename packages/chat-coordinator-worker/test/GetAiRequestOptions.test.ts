import { expect, test } from '@jest/globals'
import { getAiRequestOptions } from '../src/parts/GetAiRequestOptions/GetAiRequestOptions.ts'

test('get ai request options returns network request options for ai requests', () => {
  const result = getAiRequestOptions({
    headers: {
      Authorization: 'Bearer test-key',
    },
    maxToolCalls: 100,
    modelId: 'gpt-5-mini',
    providerId: 'openai',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    toolCallResults: [],
    tools: [
      {
        function: {
          description: 'Read a file',
          name: 'read_file',
          parameters: {
            additionalProperties: false,
            properties: {},
            type: 'object',
          },
        },
        type: 'function',
      },
    ],
    url: 'https://api.openai.com/v1/responses',
  })

  expect(result).toEqual({
    body: {
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
      max_tool_calls: 100,
      model: 'gpt-5-mini',
      tool_choice: 'auto',
      tools: [
        {
          description: 'Read a file',
          name: 'read_file',
          parameters: {
            additionalProperties: false,
            properties: {},
            type: 'object',
          },
          type: 'function',
        },
      ],
    },
    headers: {
      Authorization: 'Bearer test-key',
    },
    method: 'POST',
    providerId: 'openai',
    url: 'https://api.openai.com/v1/responses',
  })
})
