import type { GetDatabasePromise, SetDatabasePromise } from '../GetDatabase/GetDatabase.ts'
import { getDatabase } from '../GetDatabase/GetDatabase.ts'
import { transactionToPromise } from '../TransactionToPromise/TransactionToPromise.ts'

export const deleteSession = async (
  getDatabasePromise: GetDatabasePromise,
  setDatabasePromise: SetDatabasePromise,
  databaseName: string,
  databaseVersion: number,
  storeName: string,
  id: string,
): Promise<void> => {
  const database = await getDatabase(getDatabasePromise, setDatabasePromise, databaseName, databaseVersion, storeName)
  const transaction = database.transaction(storeName, 'readwrite')
  const createTransaction = (): IDBTransaction => transaction
  const store = transaction.objectStore(storeName)
  store.delete(id)
  await transactionToPromise(createTransaction)
}
