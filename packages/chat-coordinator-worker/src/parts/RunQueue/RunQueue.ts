import { aiLoop } from '../AiLoop/AiLoop.ts'
import { enqueueSessionId } from '../EnqueueSessionId/EnqueueSessionId.ts'
import { getError } from '../GetError/GetError.ts'
import { pendingSessionIds, pendingSessionWorkBySessionId, setPendingWorkPromise } from '../ProcessQueueState/ProcessQueueState.ts'
import { settleRejectedWaiters } from '../SettleRejectedWaiters/SettleRejectedWaiters.ts'
import { settleResolvedWaiters } from '../SettleResolvedWaiters/SettleResolvedWaiters.ts'

export const runQueue = async (): Promise<void> => {
  while (pendingSessionIds.length > 0) {
    const sessionId = pendingSessionIds.shift()
    if (!sessionId) {
      continue
    }
    const pendingSessionWork = pendingSessionWorkBySessionId.get(sessionId)
    if (!pendingSessionWork) {
      continue
    }
    pendingSessionWork.queued = false
    const targetVersion = pendingSessionWork.pendingVersion
    try {
      const result = await aiLoop(pendingSessionWork.options)
      if (result.type === 'reschedule') {
        enqueueSessionId(sessionId, pendingSessionWork)
        continue
      }
      if (result.type === 'error') {
        throw getError(result.error)
      }
      pendingSessionWork.processedVersion = targetVersion
      settleResolvedWaiters(pendingSessionWork, targetVersion)
    } catch (error) {
      const normalizedError = getError(error)
      pendingSessionWork.processedVersion = targetVersion
      settleRejectedWaiters(pendingSessionWork, targetVersion, normalizedError)
    }

    if (pendingSessionWork.pendingVersion > pendingSessionWork.processedVersion) {
      enqueueSessionId(sessionId, pendingSessionWork)
      continue
    }

    if (pendingSessionWork.waiters.length === 0) {
      pendingSessionWorkBySessionId.delete(sessionId)
    }
  }
  setPendingWorkPromise(undefined)
}
