export interface NetworkRequestOptions {
  readonly body?: unknown
  readonly headers?: Readonly<Record<string, string>>
  readonly method: string
  readonly providerId?: string
  readonly url: string
}
