import { RendererWorker } from '@lvce-editor/rpc-registry'

export const activateByEvent = (event: string, assetDir: string, platform: number): Promise<void> => {
  // @ts-ignore
  return RendererWorker.activateByEvent(event, assetDir, platform)
}
