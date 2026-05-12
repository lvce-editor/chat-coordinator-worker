import { expect, test } from '@jest/globals'
import { serializeHeaders } from '../src/parts/SerializeHeaders/SerializeHeaders.ts'

test('serializeHeaders returns a plain object from response headers', () => {
  const headers = new Headers([
    ['content-type', 'application/json'],
    ['x-request-id', 'req_123'],
    ['x-ratelimit-limit-requests', '500'],
    ['x-ratelimit-remaining-tokens', '199758'],
  ])

  const result = serializeHeaders(headers)

  expect(result).toEqual({
    'content-type': 'application/json',
    'x-ratelimit-limit-requests': '500',
    'x-ratelimit-remaining-tokens': '199758',
    'x-request-id': 'req_123',
  })
})
