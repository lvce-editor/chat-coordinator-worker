import { expect, jest, test } from '@jest/globals'
import { getRequestId } from '../src/parts/GetRequestId/GetRequestId.ts'

test('getRequestId returns a random uuid', () => {
  const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000')

  const result = getRequestId()

  expect(result).toBe('00000000-0000-4000-8000-000000000000')

  randomUUIDSpy.mockRestore()
})