import { expect, test } from '@jest/globals'
import { getVisibleAiErrorMessage } from '../src/parts/GetVisibleAiErrorMessage/GetVisibleAiErrorMessage.ts'

test('get visible ai error message returns a rate limit message for 429 responses', () => {
  expect(getVisibleAiErrorMessage({ error: { message: 'rate limited' } }, 429)).toBe('The AI request was rate limited. Please try again.')
})

test('get visible ai error message returns a generic fallback for thrown errors', () => {
  expect(getVisibleAiErrorMessage(new Error('request failed'))).toBe('The AI request failed. Please try again.')
})
