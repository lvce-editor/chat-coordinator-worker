import type { PendingSessionWork } from '../ProcessQueueState/ProcessQueueState.ts'
import { pendingSessionIds } from '../ProcessQueueState/ProcessQueueState.ts'

export const enqueueSessionId = (sessionId: string, pendingSessionWork: PendingSessionWork): void => {
  if (pendingSessionWork.queued) {
    return
  }
  pendingSessionIds.push(sessionId)
  pendingSessionWork.queued = true
}