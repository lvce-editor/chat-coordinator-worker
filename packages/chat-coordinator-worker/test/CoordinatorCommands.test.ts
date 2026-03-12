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

  const result = await CoordinatorCommands.submit({
    text: 'Write a migration plan',
  })

  expect(result.type).toBe('success')
  if (result.type !== 'success') {
    throw new Error('Expected submit success result')
  }

  const session = await CoordinatorCommands.getSession(result.sessionId)
  expect(session).toBeDefined()
  expect(session?.messages).toHaveLength(2)
  expect(session?.messages[0]?.role).toBe('user')
  expect(session?.messages[1]?.role).toBe('assistant')
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
