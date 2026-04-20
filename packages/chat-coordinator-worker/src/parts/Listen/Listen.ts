import { LazyTransferMessagePortRpcParent, WebWorkerRpcClient } from '@lvce-editor/rpc'
import { ChatStorageWorker, RendererWorker } from '@lvce-editor/rpc-registry'
import * as CommandMap from '../CommandMap/CommandMap.ts'
import { initializeChatMathWorker } from '../InitializeChatMathWorker/InitializeChatMathWorker.ts'
import { initializeChatMessageParsingWorker } from '../InitializeChatMessageParsingWorker/InitializeChatMessageParsingWorker.ts'

export const listen = async (): Promise<void> => {
  const r = await WebWorkerRpcClient.create({
    commandMap: CommandMap.commandMap,
  })
  RendererWorker.set(r)

  const s = await LazyTransferMessagePortRpcParent.create({
    commandMap: {},
    send(port) {
      return RendererWorker.sendMessagePortToChatStorageWorker(port)
    },
  })
  ChatStorageWorker.set(s)
  await Promise.all([initializeChatMathWorker(), initializeChatMessageParsingWorker()])
}

