import type { ChatSession } from '../../ChatSession/ChatSession.ts'
import type { GetDatabasePromise, SetDatabasePromise } from '../GetDatabase/GetDatabase.ts'
import { getDatabase } from '../GetDatabase/GetDatabase.ts'
import { requestToPromise } from '../RequestToPromise/RequestToPromise.ts'

export const listSessions = async (
  getDatabasePromise: GetDatabasePromise,
  setDatabasePromise: SetDatabasePromise,
  databaseName: string,
  databaseVersion: number,
  storeName: string,
): Promise<readonly ChatSession[]> => {
  const database = await getDatabase(getDatabasePromise, setDatabasePromise, databaseName, databaseVersion, storeName)
  const transaction = database.transaction(storeName, 'readonly')
  const store = transaction.objectStore(storeName)
  const result = await requestToPromise(() => store.getAll())
  return result
}
