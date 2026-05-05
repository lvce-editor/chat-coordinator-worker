interface NetworkRequestSuccessResult {
  data: any
  headers: Readonly<Record<string, string>>
  statusCode: number
  type: 'success'
}

interface NetworkRequestErrorResult {
  error: any
  headers: Readonly<Record<string, string>>
  statusCode: number
  type: 'error'
}

export type NetworkRequestResult = NetworkRequestErrorResult | NetworkRequestSuccessResult
