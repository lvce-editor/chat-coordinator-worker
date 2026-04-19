import { LazyTransferMessagePortRpcParent, WebWorkerRpcClient } from '@lvce-editor/rpc'
import { ChatStorageWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import * as CommandMap from '../CommandMap/CommandMap.ts'

export const listen = async (): Promise<void> => {
  await WebWorkerRpcClient.create({
    commandMap: CommandMap.commandMap,
  })

  const s = await LazyTransferMessagePortRpcParent.create({
    commandMap: {},
    send(port) {
      return RendererWorker.sendMessagePortToChatStorageWorker(port)
    },
  })
  ChatStorageWorker.set(s)
}
