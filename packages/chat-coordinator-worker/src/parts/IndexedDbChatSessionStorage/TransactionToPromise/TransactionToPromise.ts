import { toError } from '../ToError/ToError.ts'

export const transactionToPromise = async (createTransaction: () => IDBTransaction): Promise<void> => {
  const transaction = createTransaction()
  const { promise, reject, resolve } = Promise.withResolvers<void>()
  transaction.addEventListener('complete', () => {
    resolve()
  })
  transaction.addEventListener('error', () => {
    reject(toError(transaction.error))
  })
  transaction.addEventListener('abort', () => {
    reject(toError(transaction.error))
  })
  return promise
}
