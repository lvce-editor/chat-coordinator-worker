import { afterEach, expect, jest, test } from '@jest/globals'
import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import { addPendingSessionWork, processQueue, resetProcessQueue } from '../src/parts/ProcessQueue/ProcessQueue.ts'

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
}

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return {
    promise,
    resolve,
  }
}

afterEach(() => {
  jest.restoreAllMocks()
  resetProcessQueue()
})

test('process queue resolves only after the requested session version has been processed', async () => {
  const appendEvent = jest.fn(async (_event: unknown) => undefined)
  const getEvents = jest.fn(async () => {
    return [
      {
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        type: 'handle-submit',
        value: 'Hello world',
      },
    ]
  })
  const rpc = ChatStorageWorker.registerMockRpc({
    'ChatStorage.appendEvent': appendEvent,
    'ChatStorage.getEvents': getEvents,
  })
  const realDate = globalThis.Date
  const dateSpy = jest.spyOn(globalThis, 'Date').mockImplementation(() => new realDate('2026-04-19T00:00:00.000Z') as any)
  const randomUUIDSpy = jest
    .spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000002')
  const firstResponse = createDeferred<any>()
  const secondResponse = createDeferred<any>()
  const fetchSpy = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementationOnce(async () => firstResponse.promise as any)
    .mockImplementationOnce(async () => secondResponse.promise as any)

  addPendingSessionWork({
    headers: {
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    },
    modelId: 'gpt-4.1-mini',
    providerId: 'openai',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    turnId: 'turn-1',
    url: 'https://api.openai.com/v1/responses',
  })
  const firstPromise = processQueue('session-1')

  addPendingSessionWork({
    headers: {
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    },
    modelId: 'gpt-4.1-mini',
    providerId: 'openai',
    sessionId: 'session-1',
    systemPrompt: 'You are a helpful assistant.',
    text: 'Hello world',
    turnId: 'turn-2',
    url: 'https://api.openai.com/v1/responses',
  })
  const secondPromise = processQueue('session-1')

  expect(fetchSpy).toHaveBeenCalledTimes(1)

  firstResponse.resolve({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_1'],
    ]),
    json: async () => ({
      id: 'resp_1',
      status: 'completed',
    }),
  } as any)

  await expect(firstPromise).resolves.toBeUndefined()
  expect(fetchSpy).toHaveBeenCalledTimes(2)

  secondResponse.resolve({
    headers: new Headers([
      ['content-type', 'application/json'],
      ['x-request-id', 'req_2'],
    ]),
    json: async () => ({
      id: 'resp_2',
      status: 'completed',
    }),
  } as any)

  await expect(secondPromise).resolves.toBeUndefined()
  expect(rpc.invocations).toEqual([
    ['ChatStorage.getEvents', 'session-1'],
    [
      'ChatStorage.appendEvent',
      {
        body: {
          input: [
            {
              content: 'You are a helpful assistant.',
              role: 'system',
            },
            {
              content: 'Hello world',
              role: 'user',
            },
          ],
          model: 'gpt-4.1-mini',
        },
        headers: {
          Authorization: 'Bearer [redacted]',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        requestId: '00000000-0000-4000-8000-000000000001',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'turn-1',
        type: 'ai-request',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'req_1',
        },
        requestId: '00000000-0000-4000-8000-000000000001',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCalls: [],
        turnId: 'turn-1',
        type: 'ai-response-success',
        value: {
          id: 'resp_1',
          status: 'completed',
        },
      },
    ],
    ['ChatStorage.getEvents', 'session-1'],
    [
      'ChatStorage.appendEvent',
      {
        body: {
          input: [
            {
              content: 'You are a helpful assistant.',
              role: 'system',
            },
            {
              content: 'Hello world',
              role: 'user',
            },
          ],
          model: 'gpt-4.1-mini',
        },
        headers: {
          Authorization: 'Bearer [redacted]',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        requestId: '00000000-0000-4000-8000-000000000002',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        turnId: 'turn-2',
        type: 'ai-request',
      },
    ],
    [
      'ChatStorage.appendEvent',
      {
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'req_2',
        },
        requestId: '00000000-0000-4000-8000-000000000002',
        sessionId: 'session-1',
        timestamp: '2026-04-19T00:00:00.000Z',
        toolCalls: [],
        turnId: 'turn-2',
        type: 'ai-response-success',
        value: {
          id: 'resp_2',
          status: 'completed',
        },
      },
    ],
  ])

  randomUUIDSpy.mockRestore()
  dateSpy.mockRestore()
})
