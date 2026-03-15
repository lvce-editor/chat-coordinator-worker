export const getClientRequestIdHeader = (): { readonly 'x-client-request-id': string } => {
  return {
    'x-client-request-id': crypto.randomUUID(),
  }
}
