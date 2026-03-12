import { expect, test } from '@jest/globals'
import * as CoordinatorCommands from '../src/parts/CoordinatorCommands/CoordinatorCommands.ts'
import * as CoordinatorState from '../src/parts/CoordinatorState/CoordinatorState.ts'

test('createSession should create and list a session', async () => {
  CoordinatorState.reset()

  const session = await CoordinatorCommands.createSession('Planning')
  const sessions = await CoordinatorCommands.listSessions()

  expect(session.title).toBe('Planning')
  expect(sessions).toEqual([
    {
      id: session.id,
      messageCount: 0,
      title: 'Planning',
    },
  ])
})

test('submit should create a session when none is provided', async () => {
  CoordinatorState.reset()
  await CoordinatorCommands.subscribe('submit-client')

  const result = await CoordinatorCommands.submit({
    text: 'Write a migration plan',
  })

  expect(result.type).toBe('success')
  if (result.type !== 'success') {
    throw new Error('Expected submit success result')
  }

  await CoordinatorState.awaitRun(result.runId)

  const session = await CoordinatorCommands.getSession(result.sessionId)
  expect(session).toBeDefined()
  expect(session?.messages).toHaveLength(2)
  expect(session?.messages[0]?.role).toBe('user')
  expect(session?.messages[1]?.role).toBe('assistant')
  expect(session?.messages[1]?.inProgress).toBe(false)

  const events = await CoordinatorCommands.consumeEvents('submit-client')
  expect(events.some((event) => event.type === 'run-started')).toBe(true)
  expect(events.some((event) => event.type === 'run-finished')).toBe(true)
})

test('submit should return error for empty prompt', async () => {
  CoordinatorState.reset()

  const result = await CoordinatorCommands.submit({
    text: '   ',
  })

  expect(result).toEqual({
    message: 'Prompt is empty.',
    type: 'error',
  })
})

test('subscribe and consumeEvents should buffer session events', async () => {
  CoordinatorState.reset()

  await CoordinatorCommands.subscribe('client-1')
  const session = await CoordinatorCommands.createSession('Inbox')

  const events = await CoordinatorCommands.consumeEvents('client-1')
  expect(events).toEqual([
    {
      session: {
        id: session.id,
        messages: [],
        title: 'Inbox',
      },
      type: 'session-created',
    },
  ])

  const emptyEvents = await CoordinatorCommands.consumeEvents('client-1')
  expect(emptyEvents).toEqual([])
})

test('deleteSession should remove session and emit event', async () => {
  CoordinatorState.reset()

  await CoordinatorCommands.subscribe('client-2')
  const session = await CoordinatorCommands.createSession('Delete Me')
  await CoordinatorCommands.consumeEvents('client-2')

  const deleted = await CoordinatorCommands.deleteSession(session.id)
  expect(deleted).toBe(true)

  const events = await CoordinatorCommands.consumeEvents('client-2')
  expect(events).toEqual([
    {
      sessionId: session.id,
      type: 'session-deleted',
    },
  ])
})

test('submit should reject when session already has active run', async () => {
  CoordinatorState.reset()
  const session = await CoordinatorCommands.createSession('Busy')

  const first = await CoordinatorCommands.submit({
    sessionId: session.id,
    text: 'first',
  })
  expect(first.type).toBe('success')

  const second = await CoordinatorCommands.submit({
    sessionId: session.id,
    text: 'second',
  })

  expect(second).toEqual({
    message: 'Session already has an active run.',
    type: 'error',
  })

  if (first.type === 'success') {
    await CoordinatorState.awaitRun(first.runId)
  }
})

test('cancelRun should emit run-cancelled and stop progress', async () => {
  CoordinatorState.reset()
  await CoordinatorCommands.subscribe('cancel-client')

  const submitResult = await CoordinatorCommands.submit({
    text: 'cancel me please',
  })
  if (submitResult.type !== 'success') {
    throw new Error('Expected submit success result')
  }

  const cancelled = await CoordinatorCommands.cancelRun(submitResult.runId)
  expect(cancelled).toBe(true)
  await CoordinatorState.awaitRun(submitResult.runId)

  const events = await CoordinatorCommands.consumeEvents('cancel-client')
  expect(events.some((event) => event.type === 'run-cancelled')).toBe(true)
})

test('waitForEvents should return immediately when queue has events', async () => {
  CoordinatorState.reset()
  await CoordinatorCommands.subscribe('wait-client-1')
  await CoordinatorCommands.createSession('ready')

  const events = await CoordinatorCommands.waitForEvents('wait-client-1', 10)
  expect(events.length).toBeGreaterThan(0)
})

test('waitForEvents should resolve when a new event arrives', async () => {
  CoordinatorState.reset()
  await CoordinatorCommands.subscribe('wait-client-2')

  const waitPromise = CoordinatorCommands.waitForEvents('wait-client-2', 500)
  await CoordinatorCommands.createSession('delayed')
  const events = await waitPromise

  expect(events.some((event) => event.type === 'session-created')).toBe(true)
})
