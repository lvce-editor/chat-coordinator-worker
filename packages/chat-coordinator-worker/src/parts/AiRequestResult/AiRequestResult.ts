type AiRequestSuccessResult = {
  readonly data: any
  readonly type: 'success'
}

type AiRequestErrorResult = {
  readonly error: any
  readonly type: 'error'
}

export type AiRequestResult = AiRequestSuccessResult | AiRequestErrorResult
