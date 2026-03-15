import { expect, test } from '@jest/globals'
import { ExtensionHost, RendererWorker } from '@lvce-editor/rpc-registry'
import * as ExtensionHostShared from '../src/parts/ExtensionHost/ExtensionHostShared.ts'

const combineResults = (results: readonly any[]): any => {
  return results
}

test('executeProviders should activate by event and invoke method with params', async () => {
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'ExtensionHostManagement.activateByEvent': async () => {},
  })

  const mockExtensionHostRpc = ExtensionHost.registerMockRpc({
    'test.method': async () => 'test-result',
  })

  const result = await ExtensionHostShared.executeProviders({
    assetDir: '',
    combineResults,
    event: 'test.event',
    method: 'test.method',
    noProviderFoundMessage: 'No provider',
    noProviderFoundResult: null,
    params: ['param1', 'param2'],
    platform: 0,
  })

  expect(mockRendererRpc.invocations).toEqual([['ExtensionHostManagement.activateByEvent', 'test.event', '', 0]])
  expect(mockExtensionHostRpc.invocations).toEqual([['test.method', 'param1', 'param2']])
  expect(result).toBe('test-result')
})

test('executeProviders should use default noProviderFoundMessage', async () => {
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'ExtensionHostManagement.activateByEvent': async () => {},
  })

  const mockExtensionHostRpc = ExtensionHost.registerMockRpc({
    'test.method': async () => 'result',
  })

  const result = await ExtensionHostShared.executeProviders({
    assetDir: '',
    combineResults,
    event: 'test.event',
    method: 'test.method',
    noProviderFoundResult: null,
    params: [],
    platform: 0,
  })

  expect(mockRendererRpc.invocations).toEqual([['ExtensionHostManagement.activateByEvent', 'test.event', '', 0]])
  expect(mockExtensionHostRpc.invocations).toEqual([['test.method']])
  expect(result).toBe('result')
})

test('executeProvider should activate by event and invoke method with params', async () => {
  using mockRendererRpc = RendererWorker.registerMockRpc({
    'ExtensionHostManagement.activateByEvent': async () => {},
  })

  const mockExtensionHostRpc = ExtensionHost.registerMockRpc({
    'test.method': async () => 'test-result',
  })

  const result = await ExtensionHostShared.executeProvider({
    assetDir: '',
    event: 'test.event',
    method: 'test.method',
    noProviderFoundMessage: 'No provider',
    params: ['param1', 'param2'],
    platform: 0,
  })

  expect(mockRendererRpc.invocations).toEqual([['ExtensionHostManagement.activateByEvent', 'test.event', '', 0]])
  expect(mockExtensionHostRpc.invocations).toEqual([['test.method', 'param1', 'param2']])
  expect(result).toBe('test-result')
})

test('execute should invoke method with params', async () => {
  const mockExtensionHostRpc = ExtensionHost.registerMockRpc({
    'test.method': async () => undefined,
  })

  await ExtensionHostShared.execute({
    method: 'test.method',
    params: ['param1', 'param2'],
  })

  expect(mockExtensionHostRpc.invocations).toEqual([['test.method', 'param1', 'param2']])
})

test('execute should handle empty params', async () => {
  const mockExtensionHostRpc = ExtensionHost.registerMockRpc({
    'test.method': async () => undefined,
  })

  await ExtensionHostShared.execute({
    method: 'test.method',
    params: [],
  })

  expect(mockExtensionHostRpc.invocations).toEqual([['test.method']])
})
