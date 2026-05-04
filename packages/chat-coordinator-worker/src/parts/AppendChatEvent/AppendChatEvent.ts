import { ChatStorageWorker } from '@lvce-editor/rpc-registry'

export const appendChatEvent = async (event: any): Promise<void> => {
  await ChatStorageWorker.appendEvent(event)
}
