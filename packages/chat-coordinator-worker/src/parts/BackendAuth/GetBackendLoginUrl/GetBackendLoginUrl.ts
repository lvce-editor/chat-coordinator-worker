import { RendererWorker } from '@lvce-editor/rpc-registry'
import { getBackendAuthUrl } from '../GetBackendAuthUrl/GetBackendAuthUrl.ts'

const PlatformTypeElectron = 2

export interface BackendLoginRequest {
  readonly loginUrl: string
  readonly redirectUri: string
}

const getCurrentHref = async (): Promise<string> => {
  try {
    return await RendererWorker.invoke('Layout.getHref')
  } catch {
    // ignore
  }
  if (!globalThis.location || typeof globalThis.location.href !== 'string' || !globalThis.location.href) {
    return ''
  }
  return globalThis.location.href
}

const getEffectiveRedirectUri = async (platform: number, uid: number, redirectUri: string): Promise<string> => {
  if (redirectUri) {
    return redirectUri
  }
  if (platform === PlatformTypeElectron) {
    return `http://localhost:${await RendererWorker.invoke('OAuthServer.create', String(uid))}`
  }
  return getCurrentHref()
}

export const getBackendLoginUrl = async (backendUrl: string, platform = 0, uid = 0, redirectUri = ''): Promise<string> => {
  const { loginUrl } = await getBackendLoginRequest(backendUrl, platform, uid, redirectUri)
  return loginUrl
}

export const getBackendLoginRequest = async (backendUrl: string, platform = 0, uid = 0, redirectUri = ''): Promise<BackendLoginRequest> => {
  const loginUrl = new URL(getBackendAuthUrl(backendUrl, '/login'))
  const effectiveRedirectUri = await getEffectiveRedirectUri(platform, uid, redirectUri)
  if (effectiveRedirectUri) {
    loginUrl.searchParams.set('redirect_uri', effectiveRedirectUri)
  }
  return {
    loginUrl: loginUrl.toString(),
    redirectUri: effectiveRedirectUri,
  }
}
