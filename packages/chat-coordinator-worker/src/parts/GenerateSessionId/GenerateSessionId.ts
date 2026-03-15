export const generateSessionId = (): string => {
  return crypto.randomUUID()
}
