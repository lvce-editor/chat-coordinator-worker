export const getRedactedHeaders = (headers: Readonly<Record<string, string>>): Readonly<Record<string, string>> => {
  const redactedHeaders: Record<string, string> = {}

  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerName.toLowerCase() === 'authorization') {
      redactedHeaders[headerName] = headerValue.toLowerCase().startsWith('bearer ') ? 'Bearer [redacted]' : '[redacted]'
    } else {
      redactedHeaders[headerName] = headerValue
    }
  }

  return redactedHeaders
}