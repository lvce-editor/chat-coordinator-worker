import { expect, test } from '@jest/globals'
import { getAiRequestBody } from '../src/parts/GetAiRequestBody/GetAiRequestBody.ts'

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
