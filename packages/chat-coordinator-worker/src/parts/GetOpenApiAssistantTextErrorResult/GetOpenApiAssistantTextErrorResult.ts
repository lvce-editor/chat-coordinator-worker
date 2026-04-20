export interface GetOpenApiAssistantTextErrorResult {
  readonly details: 'request-failed' | 'http-error' | 'tool-iterations-exhausted'
  readonly errorCode?: string
  readonly errorMessage?: string
  readonly errorType?: string
  readonly isOffline?: boolean
  readonly iterationLimit?: number
  readonly statusCode?: number
  readonly type: 'error'
}
