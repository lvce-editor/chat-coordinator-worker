import { requestToPromise } from '../RequestToPromise/RequestToPromise.ts'

export const openSessionsDatabase = async (databaseName: string, databaseVersion: number, storeName: string): Promise<IDBDatabase> => {
  const request = indexedDB.open(databaseName, databaseVersion)
  request.addEventListener('upgradeneeded', () => {
    const database = request.result
    if (!database.objectStoreNames.contains(storeName)) {
      database.createObjectStore(storeName, {
        keyPath: 'id',
      })
    }
  })
  return requestToPromise(() => request)
}
