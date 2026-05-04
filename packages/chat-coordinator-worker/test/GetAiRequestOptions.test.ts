import { expect, test } from '@jest/globals'
import { getAiRequestOptions } from '../src/parts/GetAiRequestOptions/GetAiRequestOptions.ts'

test('get ai request options returns network request options for ai requests', () => {
  const result = getAiRequestOptions({
    headers: {
      Authorization: 'Bearer test-key',
    },
    modelId: 'gpt-5-mini',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
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
      model: 'gpt-5-mini',
    },
    headers: {
      Authorization: 'Bearer test-key',
    },
    method: 'POST',
    url: 'https://api.openai.com/v1/responses',
  })
})
