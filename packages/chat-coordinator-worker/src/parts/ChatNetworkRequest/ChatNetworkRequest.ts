import { ChatNetworkWorker } from '@lvce-editor/rpc-registry'

type JsonPrimitive = string | number | boolean | null

export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue }

interface MakeApiRequestOptions {
  readonly headers?: Readonly<Record<string, string>>
  readonly method: string
  readonly postBody?: unknown
  readonly url: string
}

export interface NetworkApiRequestSuccessResult {
  readonly body: unknown
  readonly headers: Record<string, string>
  readonly statusCode: number
  readonly type: 'success'
}

export interface NetworkApiRequestErrorResult {
  readonly headers: Record<string, string>
  readonly response: string
  readonly statusCode: number
  readonly type: 'error'
}

export type NetworkApiRequestResult = NetworkApiRequestSuccessResult | NetworkApiRequestErrorResult

export interface NetworkStreamingApiRequestSuccessResult {
  readonly body: readonly unknown[]
  readonly headers: Record<string, string>
  readonly statusCode: number
  readonly type: 'success'
}

export type NetworkStreamingApiRequestResult = NetworkStreamingApiRequestSuccessResult | NetworkApiRequestErrorResult

export const makeApiRequest = async (options: Readonly<MakeApiRequestOptions>): Promise<NetworkApiRequestResult> => {
  return ChatNetworkWorker.invoke('ChatNetwork.makeApiRequest', options) as Promise<NetworkApiRequestResult>
}

export const makeStreamingApiRequest = async (options: Readonly<MakeApiRequestOptions>): Promise<NetworkStreamingApiRequestResult> => {
  return ChatNetworkWorker.invoke('ChatNetwork.makeStreamingApiRequest', options) as Promise<NetworkStreamingApiRequestResult>
}
