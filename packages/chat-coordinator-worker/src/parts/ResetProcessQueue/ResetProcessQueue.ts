import { pendingSessionIds, pendingSessionWorkBySessionId, setPendingWorkPromise } from '../ProcessQueueState/ProcessQueueState.ts'

export const resetProcessQueue = (): void => {
  pendingSessionIds.length = 0
  pendingSessionWorkBySessionId.clear()
  setPendingWorkPromise(undefined)
}
