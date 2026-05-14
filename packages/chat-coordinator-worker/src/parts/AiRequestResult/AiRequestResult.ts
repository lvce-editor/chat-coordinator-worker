type AiRequestSuccessResult = {
  readonly data: any
  readonly headers: Readonly<Record<string, string>>
  readonly size: number
  readonly statusCode: number
  readonly type: 'success'
}

type AiRequestErrorResult = {
  readonly error: any
  readonly size: number
  readonly statusCode: number
  readonly type: 'error'
}

export type AiRequestResult = AiRequestSuccessResult | AiRequestErrorResult
