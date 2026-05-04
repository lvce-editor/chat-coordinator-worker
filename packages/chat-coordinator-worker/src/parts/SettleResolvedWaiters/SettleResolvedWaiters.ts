import type { PendingSessionWork, QueueWaiter } from '../ProcessQueueState/ProcessQueueState.ts'

export const settleResolvedWaiters = (pendingSessionWork: PendingSessionWork, processedVersion: number): void => {
  const remainingWaiters: QueueWaiter[] = []
  for (const waiter of pendingSessionWork.waiters) {
    if (waiter.targetVersion <= processedVersion) {
      waiter.resolve()
      continue
    }
    remainingWaiters.push(waiter)
  }
  pendingSessionWork.waiters = remainingWaiters
}