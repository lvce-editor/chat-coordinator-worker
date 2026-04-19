interface NetworkRequestSuccessResult {
  data: any
  headers: Readonly<Record<string, string>>
  type: 'success'
}

interface NetworkRequestErrorResult {
  error: any
  type: 'error'
}

export type NetworkRequestResult = NetworkRequestErrorResult | NetworkRequestSuccessResult
