import { LazyTransferMessagePortRpcParent } from '@lvce-editor/rpc'
import { ChatStorageWorker, ChatToolWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import * as CommandMap from '../CommandMap/CommandMap.ts'
import { initializeAuthWorker } from '../InitializeAuthWorker/InitializeAuthWorker.ts'

export const listen = async (): Promise<void> => {
  await RendererWorker.initializeRendererWorkerForWorker(CommandMap.commandMap)

  const s = await LazyTransferMessagePortRpcParent.create({
    commandMap: {},
    send(port) {
      return RendererWorker.sendMessagePortToChatStorageWorker(port)
    },
  })
  ChatStorageWorker.set(s)

  const t = await LazyTransferMessagePortRpcParent.create({
    commandMap: {},
    send(port) {
      return RendererWorker.sendMessagePortToChatToolWorker(port)
    },
  })
  ChatToolWorker.set(t)

  await initializeAuthWorker()
}
