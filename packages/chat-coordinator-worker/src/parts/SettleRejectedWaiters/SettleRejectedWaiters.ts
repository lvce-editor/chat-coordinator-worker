import type { PendingSessionWork, QueueWaiter } from '../ProcessQueueState/ProcessQueueState.ts'

export const settleRejectedWaiters = (pendingSessionWork: PendingSessionWork, processedVersion: number, error: Error): void => {
  const remainingWaiters: QueueWaiter[] = []
  for (const waiter of pendingSessionWork.waiters) {
    if (waiter.targetVersion <= processedVersion) {
      waiter.reject(error)
      continue
    }
    remainingWaiters.push(waiter)
  }
  pendingSessionWork.waiters = remainingWaiters
}