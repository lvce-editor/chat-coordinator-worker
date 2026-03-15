import { toError } from '../ToError/ToError.ts'

export const requestToPromise = async <T>(createRequest: () => IDBRequest<T>): Promise<T> => {
  const request = createRequest()
  const { promise, reject, resolve } = Promise.withResolvers<T>()
  request.addEventListener('success', () => {
    resolve(request.result)
  })
  request.addEventListener('error', () => {
    reject(toError(request.error))
  })
  return promise
}
