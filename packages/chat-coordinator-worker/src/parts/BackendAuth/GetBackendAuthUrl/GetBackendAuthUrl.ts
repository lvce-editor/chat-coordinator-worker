import { trimTrailingSlashes } from '../TrimTrailingSlashes/TrimTrailingSlashes.ts'

export const getBackendAuthUrl = (backendUrl: string, path: string): string => {
  return `${trimTrailingSlashes(backendUrl)}${path}`
}
