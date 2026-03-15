export interface GetOpenApiAssistantTextErrorResult {
  readonly details: 'request-failed' | 'http-error'
  readonly errorCode?: string
  readonly errorMessage?: string
  readonly errorType?: string
  readonly statusCode?: number
  readonly type: 'error'
}
