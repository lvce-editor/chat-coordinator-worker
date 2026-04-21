export const getRequestId = (): string => {
  return crypto.randomUUID()
}
