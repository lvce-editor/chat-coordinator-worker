import { expect, test } from '@jest/globals'
import { getVisibleAiErrorMessage } from '../src/parts/GetVisibleAiErrorMessage/GetVisibleAiErrorMessage.ts'

test('get visible ai error message returns a rate limit message for 429 responses', () => {
  expect(getVisibleAiErrorMessage({ error: { message: 'rate limited' } }, 429)).toBe('The AI request was rate limited. Please try again.')
})

test('get visible ai error message returns a generic fallback for thrown errors', () => {
  expect(getVisibleAiErrorMessage(new Error('request failed'))).toBe('The AI request failed. Please try again.')
})

test('get visible ai error message returns backend http error details', () => {
  expect(
    getVisibleAiErrorMessage(
      {
        error: 'Backend rejected the request.',
      },
      403,
      'backend',
    ),
  ).toBe('Backend completion request failed (status 403). Backend rejected the request.')
})

test('get visible ai error message returns backend transport failure details', () => {
  expect(getVisibleAiErrorMessage(new Error('fetch failed'), undefined, 'backend')).toBe('Backend completion request failed. fetch failed')
})
