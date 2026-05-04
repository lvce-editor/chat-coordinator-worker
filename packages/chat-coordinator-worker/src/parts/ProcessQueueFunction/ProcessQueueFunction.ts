import { pendingSessionWorkBySessionId, pendingWorkPromise, setPendingWorkPromise } from '../ProcessQueueState/ProcessQueueState.ts'
import { runQueue } from '../RunQueue/RunQueue.ts'

export const processQueue = async (sessionId: string): Promise<void> => {
  const pendingSessionWork = pendingSessionWorkBySessionId.get(sessionId)
  if (!pendingSessionWork) {
    return
  }
  if (pendingSessionWork.pendingVersion <= pendingSessionWork.processedVersion) {
    return
  }
  const targetVersion = pendingSessionWork.pendingVersion
  const promise = new Promise<void>((resolve, reject) => {
    pendingSessionWork.waiters.push({
      reject,
      resolve,
      targetVersion,
    })
  })
  if (!pendingWorkPromise) {
    setPendingWorkPromise(runQueue())
  }
  await promise
}