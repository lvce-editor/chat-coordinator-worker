import { RendererWorker } from '@lvce-editor/rpc-registry'

export const measureTextBlockHeight = async (
  text: string,
  fontFamily: string,
  fontSize: number,
  lineHeight: string,
  width: number,
): Promise<number> => {
  // Upstream renderer types currently require number, but runtime accepts px strings.
  // Keep forwarding the string to preserve chat-view behavior until upstream is updated.
  // @ts-ignore
  return RendererWorker.measureTextBlockHeight(text, fontFamily, fontSize, lineHeight, width)
}
