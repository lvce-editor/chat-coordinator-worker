export const serializeHeaders = (headers: Headers): Readonly<Record<string, string>> => {
  return Object.fromEntries(headers.entries())
}