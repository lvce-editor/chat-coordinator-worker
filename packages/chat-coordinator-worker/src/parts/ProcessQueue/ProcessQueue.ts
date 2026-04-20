import type { AiLoopOptions } from '../AiLoopOptions/AiLoopOptions.ts'
import { aiLoop } from '../AiLoop/AiLoop.ts'

interface QueueWaiter {
  readonly reject: (error: Error) => void
  readonly resolve: () => void
  readonly targetVersion: number
}

interface PendingSessionWork {
  options: AiLoopOptions
  pendingVersion: number
  processedVersion: number
  queued: boolean
  waiters: QueueWaiter[]
}

const pendingSessionIds: string[] = []
const pendingSessionWorkBySessionId = new Map<string, PendingSessionWork>()

let pendingWorkPromise: Promise<void> | undefined

const enqueueSessionId = (sessionId: string, pendingSessionWork: PendingSessionWork): void => {
  if (pendingSessionWork.queued) {
    return
  }
  pendingSessionIds.push(sessionId)
  pendingSessionWork.queued = true
}

const settleResolvedWaiters = (pendingSessionWork: PendingSessionWork, processedVersion: number): void => {
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

const settleRejectedWaiters = (pendingSessionWork: PendingSessionWork, processedVersion: number, error: Error): void => {
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

const getError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error
  }
  return new Error(String(error))
}

const runQueue = async (): Promise<void> => {
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
      if (result.type === 'error') {
        throw result.error
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
  pendingWorkPromise = undefined
}

export const addPendingSessionWork = (options: AiLoopOptions): void => {
  const existingPendingSessionWork = pendingSessionWorkBySessionId.get(options.sessionId)
  if (existingPendingSessionWork) {
    existingPendingSessionWork.options = options
    existingPendingSessionWork.pendingVersion += 1
    enqueueSessionId(options.sessionId, existingPendingSessionWork)
    return
  }
  const pendingSessionWork: PendingSessionWork = {
    options,
    pendingVersion: 1,
    processedVersion: 0,
    queued: false,
    waiters: [],
  }
  pendingSessionWorkBySessionId.set(options.sessionId, pendingSessionWork)
  enqueueSessionId(options.sessionId, pendingSessionWork)
}

// TODO simplify this
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
    pendingWorkPromise = runQueue()
  }
  await promise
}

export const resetProcessQueue = (): void => {
  pendingSessionIds.length = 0
  pendingSessionWorkBySessionId.clear()
  pendingWorkPromise = undefined
}
