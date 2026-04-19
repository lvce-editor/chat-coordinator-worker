interface NetworkRequestSuccessResult {
  data: any
  type: 'success'
}

interface NetworkRequestErrorResult {
  error: any
  type: 'error'
}

export type NetworkRequestResult = NetworkRequestErrorResult | NetworkRequestSuccessResult
