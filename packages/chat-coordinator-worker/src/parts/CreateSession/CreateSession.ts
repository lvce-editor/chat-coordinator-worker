import { ChatStorageWorker } from '@lvce-editor/rpc-registry'

export interface CreateSessionOptions {
  readonly sessionId: string
  readonly timestamp: string
  readonly title: string
}

export const createSession = async (options: CreateSessionOptions): Promise<void> => {
  const { sessionId, timestamp, title } = options
  await ChatStorageWorker.invoke('ChatStorage.createSession', {
    sessionId,
    timestamp,
    title,
  })
}
