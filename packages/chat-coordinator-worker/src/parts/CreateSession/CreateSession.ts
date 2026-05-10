import { ChatStorageWorker } from '@lvce-editor/rpc-registry'

export interface CreateSessionOptions {
  readonly sessionId: string
  readonly text: string
  readonly timestamp: string
}

export const createSession = async (options: CreateSessionOptions): Promise<void> => {
  const { sessionId, timestamp } = options
  await ChatStorageWorker.invoke('ChatStorage.createSession', {
    sessionId,
    timestamp,
  })
}
