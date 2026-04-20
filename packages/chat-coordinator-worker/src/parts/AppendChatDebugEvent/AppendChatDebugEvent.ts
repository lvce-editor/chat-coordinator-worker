import { ChatStorageWorker } from '@lvce-editor/rpc-registry'

export const appendChatDebugEvent = async (event: any): Promise<void> => {
  await ChatStorageWorker.appendDebugEvent(event)
}