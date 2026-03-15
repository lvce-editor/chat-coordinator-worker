import { ExtensionHost } from '@lvce-editor/rpc-registry'
import * as ExtensionHostManagement from '../ExtensionHostManagement/ExtensionHostManagement.ts'

type ExecuteProvidersOptions = {
  readonly combineResults: (results: readonly any[]) => any
  readonly event: string
  readonly method: string
  readonly noProviderFoundMessage?: string
  readonly noProviderFoundResult: any
  readonly params: readonly any[]
  readonly assetDir: string
  readonly platform: number
}

export const executeProviders = async ({
  assetDir,
  combineResults,
  event,
  method,
  noProviderFoundMessage = 'No provider found',
  noProviderFoundResult,
  params,
  platform,
}: ExecuteProvidersOptions): Promise<any> => {
  await ExtensionHostManagement.activateByEvent(event, assetDir, platform)
  // @ts-ignore
  const result = await ExtensionHost.invoke(method, ...params)
  return result
}

type ExecuteProviderOptions = {
  readonly event: string
  readonly method: string
  readonly noProviderFoundMessage: string
  readonly params: readonly any[]
  readonly assetDir: string
  readonly platform: number
}

export const executeProvider = async ({
  assetDir,
  event,
  method,
  noProviderFoundMessage,
  params,
  platform,
}: ExecuteProviderOptions): Promise<any> => {
  await ExtensionHostManagement.activateByEvent(event, assetDir, platform)
  // @ts-ignore
  const result = ExtensionHost.invoke(method, ...params)
  return result
}

type ExecuteOptions = {
  readonly method: string
  readonly params: readonly any[]
}

export const execute = async ({ method, params }: ExecuteOptions): Promise<any> => {
  // @ts-ignore
  await ExtensionHost.invoke(method, ...params)
}
