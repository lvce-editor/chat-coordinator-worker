import { LazyTransferMessagePortRpcParent } from '@lvce-editor/rpc'
import { ChatMessageParsingWorker, RendererWorker } from '@lvce-editor/rpc-registry'

const sendMessagePortToChatMessageParsingWorker = async (port: MessagePort): Promise<void> => {
  await RendererWorker.sendMessagePortToChatMessageParsingWorker(port, 0)
}

export const initializeChatMessageParsingWorker = async (): Promise<void> => {
  const rpc = await LazyTransferMessagePortRpcParent.create({
    commandMap: {},
    send: sendMessagePortToChatMessageParsingWorker,
  })
  ChatMessageParsingWorker.set(rpc)
}
