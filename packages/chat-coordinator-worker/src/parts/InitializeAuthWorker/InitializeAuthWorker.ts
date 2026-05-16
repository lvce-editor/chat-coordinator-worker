import { LazyTransferMessagePortRpcParent } from '@lvce-editor/rpc'
import { AuthWorker, RendererWorker } from '@lvce-editor/rpc-registry'

const sendMessagePortToAuthWorker = async (port: MessagePort): Promise<void> => {
  await RendererWorker.sendMessagePortToAuthWorker(port, 0)
}

export const initializeAuthWorker = async (): Promise<void> => {
  const rpc = await LazyTransferMessagePortRpcParent.create({
    commandMap: {},
    send: sendMessagePortToAuthWorker,
  })
  AuthWorker.set(rpc)
}
