import { openSessionsDatabase } from '../OpenSessionsDatabase/OpenSessionsDatabase.ts'

export type GetDatabasePromise = () => Promise<IDBDatabase> | undefined
export type SetDatabasePromise = (databasePromise: Readonly<Promise<IDBDatabase>>) => void

export const getDatabase = async (
  getDatabasePromise: GetDatabasePromise,
  setDatabasePromise: SetDatabasePromise,
  databaseName: string,
  databaseVersion: number,
  storeName: string,
): Promise<IDBDatabase> => {
  const existingDatabasePromise = getDatabasePromise()
  if (existingDatabasePromise) {
    return existingDatabasePromise
  }
  const nextDatabasePromise = openSessionsDatabase(databaseName, databaseVersion, storeName)
  setDatabasePromise(nextDatabasePromise)
  return nextDatabasePromise
}
