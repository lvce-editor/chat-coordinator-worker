import type { AiLoopOptions } from '../AiLoopOptions/AiLoopOptions.ts'

export interface QueueWaiter {
  readonly reject: (error: Error) => void
  readonly resolve: () => void
  readonly targetVersion: number
}

export interface PendingSessionWork {
  options: AiLoopOptions
  pendingVersion: number
  processedVersion: number
  queued: boolean
  waiters: QueueWaiter[]
}

export const pendingSessionIds: string[] = []
export const pendingSessionWorkBySessionId = new Map<string, PendingSessionWork>()

export let pendingWorkPromise: Promise<void> | undefined

export const setPendingWorkPromise = (value: Promise<void> | undefined): void => {
  pendingWorkPromise = value
}