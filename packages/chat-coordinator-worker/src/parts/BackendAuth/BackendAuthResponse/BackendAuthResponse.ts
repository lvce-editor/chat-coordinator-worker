export interface BackendAuthResponse {
  readonly accessToken?: string
  readonly error?: string
  readonly subscriptionPlan?: string
  readonly usedTokens?: number
  readonly userName?: string
}
