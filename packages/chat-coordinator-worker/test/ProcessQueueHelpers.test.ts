import { afterEach, expect, test } from '@jest/globals'
import type { AiLoopOptions } from '../src/parts/AiLoopOptions/AiLoopOptions.ts'
import { addPendingSessionWork } from '../src/parts/AddPendingSessionWork/AddPendingSessionWork.ts'
import { enqueueSessionId } from '../src/parts/EnqueueSessionId/EnqueueSessionId.ts'
import { getError } from '../src/parts/GetError/GetError.ts'
import {
  pendingSessionIds,
  pendingSessionWorkBySessionId,
  setPendingWorkPromise,
  type PendingSessionWork,
  type QueueWaiter,
} from '../src/parts/ProcessQueueState/ProcessQueueState.ts'
import { resetProcessQueue } from '../src/parts/ResetProcessQueue/ResetProcessQueue.ts'
import { settleRejectedWaiters } from '../src/parts/SettleRejectedWaiters/SettleRejectedWaiters.ts'
import { settleResolvedWaiters } from '../src/parts/SettleResolvedWaiters/SettleResolvedWaiters.ts'

const createOptions = (sessionId: string, turnId: string): AiLoopOptions => {
  return {
    headers: {
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    },
    modelId: 'gpt-4.1-mini',
    providerId: 'openai',
    sessionId,
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    turnId,
    url: 'https://api.openai.com/v1/responses',
  }
}

const createWaiter = (targetVersion: number) => {
  const calls: string[] = []
  const errors: Error[] = []
  const waiter: QueueWaiter = {
    reject: (error: Error) => {
      calls.push('reject')
      errors.push(error)
    },
    resolve: () => {
      calls.push('resolve')
    },
    targetVersion,
  }
  return {
    calls,
    errors,
    waiter,
  }
}

const createPendingSessionWork = (): PendingSessionWork => {
  return {
    options: createOptions('session-1', 'turn-1'),
    pendingVersion: 2,
    processedVersion: 0,
    queued: false,
    waiters: [],
  }
}

afterEach(() => {
  resetProcessQueue()
})

test('enqueueSessionId queues a session only once', () => {
  const pendingSessionWork = createPendingSessionWork()

  enqueueSessionId('session-1', pendingSessionWork)
  enqueueSessionId('session-1', pendingSessionWork)

  expect(pendingSessionIds).toEqual(['session-1'])
  expect(pendingSessionWork.queued).toBe(true)
})

test('settleResolvedWaiters resolves eligible waiters and keeps later waiters', () => {
  const firstWaiter = createWaiter(1)
  const secondWaiter = createWaiter(3)
  const pendingSessionWork = createPendingSessionWork()
  pendingSessionWork.waiters = [firstWaiter.waiter, secondWaiter.waiter]

  settleResolvedWaiters(pendingSessionWork, 2)

  expect(firstWaiter.calls).toEqual(['resolve'])
  expect(secondWaiter.calls).toEqual([])
  expect(pendingSessionWork.waiters).toEqual([secondWaiter.waiter])
})

test('settleRejectedWaiters rejects eligible waiters and keeps later waiters', () => {
  const firstWaiter = createWaiter(1)
  const secondWaiter = createWaiter(3)
  const pendingSessionWork = createPendingSessionWork()
  const error = new Error('request failed')
  pendingSessionWork.waiters = [firstWaiter.waiter, secondWaiter.waiter]

  settleRejectedWaiters(pendingSessionWork, 2, error)

  expect(firstWaiter.calls).toEqual(['reject'])
  expect(firstWaiter.errors).toEqual([error])
  expect(secondWaiter.calls).toEqual([])
  expect(pendingSessionWork.waiters).toEqual([secondWaiter.waiter])
})

test('getError returns the same Error instance when given an Error', () => {
  const error = new Error('boom')

  expect(getError(error)).toBe(error)
})

test('getError normalizes non-Error values', () => {
  expect(getError('boom')).toEqual(new Error('boom'))
})

test('addPendingSessionWork creates new pending session work', () => {
  const options = createOptions('session-1', 'turn-1')

  addPendingSessionWork(options)

  expect(pendingSessionIds).toEqual(['session-1'])
  expect(pendingSessionWorkBySessionId.get('session-1')).toEqual({
    options,
    pendingVersion: 1,
    processedVersion: 0,
    queued: true,
    waiters: [],
  })
})

test('addPendingSessionWork updates existing pending session work', () => {
  const firstOptions = createOptions('session-1', 'turn-1')
  const secondOptions = createOptions('session-1', 'turn-2')

  addPendingSessionWork(firstOptions)
  addPendingSessionWork(secondOptions)

  expect(pendingSessionIds).toEqual(['session-1'])
  expect(pendingSessionWorkBySessionId.get('session-1')).toEqual({
    options: secondOptions,
    pendingVersion: 2,
    processedVersion: 0,
    queued: true,
    waiters: [],
  })
})

test('resetProcessQueue clears the shared queue state', async () => {
  addPendingSessionWork(createOptions('session-1', 'turn-1'))
  setPendingWorkPromise((async () => {})())

  resetProcessQueue()

  expect(pendingSessionIds).toEqual([])
  expect(pendingSessionWorkBySessionId.size).toBe(0)
})
