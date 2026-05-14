interface NetworkRequestSuccessResult {
  data: any
  headers: Readonly<Record<string, string>>
  size: number
  statusCode: number
  type: 'success'
}

interface NetworkRequestErrorResult {
  error: any
  headers: Readonly<Record<string, string>>
  size: number
  statusCode: number
  type: 'error'
}

export type NetworkRequestResult = NetworkRequestErrorResult | NetworkRequestSuccessResult
