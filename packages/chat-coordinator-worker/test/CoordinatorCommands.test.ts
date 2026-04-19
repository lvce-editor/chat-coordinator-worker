import { beforeEach, expect, test } from '@jest/globals'
import { ChatStorageWorker, ChatToolWorker } from '@lvce-editor/rpc-registry'
import { resetChatSessionStorage } from '../src/parts/ChatSessionStorage/ChatSessionStorage.ts'
import * as CoordinatorCommands from '../src/parts/CoordinatorCommands/CoordinatorCommands.ts'
import * as CoordinatorState from '../src/parts/CoordinatorState/CoordinatorState.ts'
import { InMemoryChatSessionStorage } from '../src/parts/InMemoryChatSessionStorage/InMemoryChatSessionStorage.ts'
import * as MockOpenApiRequest from '../src/parts/MockOpenApiRequest/MockOpenApiRequest.ts'
import * as MockOpenApiStream from '../src/parts/MockOpenApiStream/MockOpenApiStream.ts'

beforeEach(() => {
  CoordinatorState.reset()
  MockOpenApiRequest.reset()
  MockOpenApiStream.reset()
  resetChatSessionStorage()
})

test('createSession should create and list a session', async () => {
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
  const result = await CoordinatorCommands.submit({
    text: '   ',
  })

  expect(result).toEqual({
    message: 'Prompt is empty.',
    type: 'error',
  })
})

test('subscribe and consumeEvents should buffer session events', async () => {
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
  await CoordinatorCommands.subscribe('wait-client-1')
  await CoordinatorCommands.createSession('ready')

  const events = await CoordinatorCommands.waitForEvents('wait-client-1', 10)
  expect(events.length).toBeGreaterThan(0)
})

test('waitForEvents should resolve when a new event arrives', async () => {
  await CoordinatorCommands.subscribe('wait-client-2')

  const waitPromise = CoordinatorCommands.waitForEvents('wait-client-2', 500)
  await CoordinatorCommands.createSession('delayed')
  const events = await waitPromise

  expect(events.some((event) => event.type === 'session-created')).toBe(true)
})

test('listSessions should hydrate persisted sessions after coordinator reset', async () => {
  const session = await CoordinatorCommands.createSession('Persisted Session')

  CoordinatorState.reset()

  const sessions = await CoordinatorCommands.listSessions()

  expect(sessions).toEqual([
    {
      id: session.id,
      messageCount: 0,
      title: 'Persisted Session',
    },
  ])
})

test('getSession should hydrate persisted messages after coordinator reset', async () => {
  const result = await CoordinatorCommands.submit({
    text: 'Persist this conversation',
  })
  if (result.type !== 'success') {
    throw new Error('Expected submit success result')
  }
  await CoordinatorState.awaitRun(result.runId)

  CoordinatorState.reset()

  const session = await CoordinatorCommands.getSession(result.sessionId)

  expect(session).toBeDefined()
  expect(session?.messages).toEqual([
    expect.objectContaining({
      id: result.userMessageId,
      role: 'user',
      text: 'Persist this conversation',
    }),
    expect.objectContaining({
      id: result.assistantMessageId,
      inProgress: false,
      role: 'assistant',
      text: 'Coordinator pipeline placeholder response for: Persist this conversation',
    }),
  ])
})

test('handleSubmit should persist through chat-storage-worker', async () => {
  const storage = new InMemoryChatSessionStorage()
  using mockStorageRpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendEvent': async (event: unknown) => {
      await storage.appendEvent(event as any)
    },
    'ChatStorage.deleteSession': async (id: string) => {
      await storage.deleteSession(id)
    },
    'ChatStorage.getEvents': async (sessionId?: string) => storage.getEvents(sessionId),
    'ChatStorage.getSession': async (id: string) => storage.getSession(id),
    'ChatStorage.listSessions': async () => storage.listSessions(),
    'ChatStorage.setSession': async (session: { id: string; messages: readonly any[]; projectId?: string; title: string }) => {
      await storage.setSession(session as any)
    },
  })

  const result = await CoordinatorCommands.handleSubmit({
    assetDir: '',
    mockAiResponseDelay: 0,
    mockApiCommandId: '',
    models: [{ id: 'test', name: 'Test' }],
    openApiApiBaseUrl: 'https://api.openai.com/v1',
    openApiApiKey: '',
    openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
    openRouterApiKey: '',
    platform: 0,
    projectId: 'project-1',
    selectedModelId: 'test',
    streamingEnabled: true,
    useMockApi: true,
    userText: 'hello from coordinator',
    webSearchEnabled: false,
  })

  expect(result.type).toBe('success')
  if (result.type !== 'success') {
    throw new Error('Expected handleSubmit success result')
  }

  await CoordinatorState.awaitRun(result.runId)

  expect(mockStorageRpc.invocations[0]).toEqual(['ChatStorage.getEvents', result.sessionId])
  expect(mockStorageRpc.invocations.some((invocation) => invocation[0] === 'ChatStorage.getEvents')).toBe(true)
  expect(mockStorageRpc.invocations.some((invocation) => invocation[0] === 'ChatStorage.appendEvent')).toBe(true)

  const session = await CoordinatorCommands.getSession(result.sessionId)
  expect(session?.messages).toEqual([
    expect.objectContaining({
      id: result.userMessageId,
      role: 'user',
      text: 'hello from coordinator',
    }),
    expect.objectContaining({
      id: result.assistantMessageId,
      inProgress: false,
      role: 'assistant',
      text: 'Mock AI response: I received "hello from coordinator".',
    }),
  ])
})

test('handleSubmit should rebuild previous history from events, ignore progress events, and persist tool execution events', async () => {
  const storage = new InMemoryChatSessionStorage()
  await storage.appendEvent({
    sessionId: 'session-1',
    timestamp: '2026-04-01T10:00:00.000Z',
    title: 'Existing Session',
    type: 'chat-session-created',
  })
  await storage.appendEvent({
    message: {
      id: 'user-1',
      role: 'user',
      text: 'previous user',
      time: '10:00',
    },
    sessionId: 'session-1',
    timestamp: '2026-04-01T10:00:01.000Z',
    type: 'chat-message-added',
  })
  await storage.appendEvent({
    message: {
      id: 'assistant-1',
      role: 'assistant',
      text: 'previous answer',
      time: '10:01',
    },
    sessionId: 'session-1',
    timestamp: '2026-04-01T10:00:02.000Z',
    type: 'chat-message-added',
  })
  await storage.appendEvent({
    sessionId: 'session-1',
    timestamp: '2026-04-01T10:00:03.000Z',
    type: 'sse-response-part',
    value: { delta: 'ignore me' },
  })
  await storage.appendEvent({
    sessionId: 'session-1',
    timestamp: '2026-04-01T10:00:04.000Z',
    type: 'event-stream-finished',
    value: '[DONE]',
  })

  using mockStorageRpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendEvent': async (event: unknown) => {
      await storage.appendEvent(event as any)
    },
    'ChatStorage.deleteSession': async (id: string) => {
      await storage.deleteSession(id)
    },
    'ChatStorage.getEvents': async (sessionId?: string) => storage.getEvents(sessionId),
    'ChatStorage.getSession': async (id: string) => storage.getSession(id),
    'ChatStorage.listSessions': async () => storage.listSessions(),
    'ChatStorage.setSession': async (session: { id: string; messages: readonly any[]; projectId?: string; title: string }) => {
      await storage.setSession(session as any)
    },
  })
  using mockToolRpc = ChatToolWorker.registerMockRpc({
    'ChatTool.execute': async (_name: string, _rawArguments: string) => ({ ok: true, summary: 'tool finished' }),
  })

  MockOpenApiStream.pushChunk(
    'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"function_call","call_id":"call_1","name":"read_file","arguments":""}}\n\n',
  )
  MockOpenApiStream.pushChunk('data: {"type":"response.function_call_arguments.delta","output_index":0,"delta":"{\\"path\\":\\"src/main.ts\\"}"}\n\n')
  MockOpenApiStream.pushChunk(
    'data: {"type":"response.completed","response":{"id":"resp_1","output":[{"type":"function_call","call_id":"call_1","name":"read_file","arguments":"{\\"path\\":\\"src/main.ts\\"}"}]}}\n\n',
  )
  MockOpenApiStream.pushChunk('data: [DONE]\n\n')
  MockOpenApiStream.pushChunk('data: {"type":"response.output_text.delta","delta":"final answer"}\n\n')
  MockOpenApiStream.pushChunk('data: {"type":"response.completed","response":{"id":"resp_2","output":[]}}\n\n')
  MockOpenApiStream.pushChunk('data: [DONE]\n\n')
  MockOpenApiStream.finish()

  const result = await CoordinatorCommands.handleSubmit({
    assetDir: '/tmp',
    messageId: 'user-2',
    mockApiCommandId: '',
    models: [{ id: 'openapi/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openApi' }],
    openApiApiBaseUrl: 'https://api.openai.com/v1',
    openApiApiKey: '',
    openRouterApiBaseUrl: 'https://openrouter.ai/api/v1',
    openRouterApiKey: '',
    platform: 0,
    selectedModelId: 'openapi/gpt-4.1-mini',
    sessionId: 'session-1',
    streamingEnabled: true,
    useMockApi: true,
    userText: 'current user',
    webSearchEnabled: false,
  })

  expect(result.type).toBe('success')
  if (result.type !== 'success') {
    throw new Error('Expected handleSubmit success result')
  }

  await CoordinatorState.awaitRun(result.runId)

  expect(mockToolRpc.invocations).toEqual([['ChatTool.execute', 'read_file', '{"path":"src/main.ts"}', { assetDir: '/tmp', platform: 0 }]])
  expect(mockStorageRpc.invocations.some((invocation) => invocation[0] === 'ChatStorage.getEvents')).toBe(true)

  const requests = MockOpenApiRequest.getAll()
  expect(requests).toHaveLength(2)
  expect(requests[0]?.payload).toMatchObject({
    input: [
      {
        content: 'previous user',
        role: 'user',
      },
      {
        content: 'previous answer',
        role: 'assistant',
      },
      {
        content: 'current user',
        role: 'user',
      },
    ],
  })
  expect(requests[1]?.payload).toMatchObject({
    input: [
      {
        call_id: 'call_1',
        output: '{"ok":true,"summary":"tool finished"}',
        type: 'function_call_output',
      },
    ],
    previous_response_id: 'resp_1',
  })

  const events = await storage.getEvents('session-1')
  expect(events.some((event) => event.type === 'tool-execution-started')).toBe(true)
  expect(events.some((event) => event.type === 'tool-execution-finished')).toBe(true)
  expect(events.some((event) => event.type === 'handle-submit')).toBe(true)

  const session = await CoordinatorCommands.getSession('session-1')
  expect(session?.messages).toEqual([
    expect.objectContaining({ id: 'user-1', role: 'user', text: 'previous user' }),
    expect.objectContaining({ id: 'assistant-1', role: 'assistant', text: 'previous answer' }),
    expect.objectContaining({ id: 'user-2', role: 'user', text: 'current user' }),
    expect.objectContaining({ id: result.assistantMessageId, inProgress: false, role: 'assistant' }),
  ])
})
