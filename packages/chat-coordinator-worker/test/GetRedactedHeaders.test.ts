import { expect, test } from '@jest/globals'
import { getRedactedHeaders } from '../src/parts/GetRedactedHeaders/GetRedactedHeaders.ts'

test('getRedactedHeaders redacts bearer authorization headers', () => {
  const result = getRedactedHeaders({
    Authorization: 'Bearer test-key',
    'Content-Type': 'application/json',
  })

  expect(result).toEqual({
    Authorization: 'Bearer [redacted]',
    'Content-Type': 'application/json',
  })
})

test('getRedactedHeaders redacts non-bearer authorization headers', () => {
  const result = getRedactedHeaders({
    Authorization: 'Basic test-key',
  })

  expect(result).toEqual({
    Authorization: '[redacted]',
  })
})