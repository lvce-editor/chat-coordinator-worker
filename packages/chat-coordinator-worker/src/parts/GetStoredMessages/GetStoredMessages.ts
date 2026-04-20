import { ChatStorageWorker } from '@lvce-editor/rpc-registry'
import * as ChatEventType from '../ChatEventType/ChatEventType.ts'

type StoredEvent = Awaited<ReturnType<typeof ChatStorageWorker.getEvents>>[number]

const isHandleSubmitEvent = (event: StoredEvent): event is StoredEvent & { readonly value: string } => {
  return event.type === ChatEventType.HandleSubmit
}

export const getStoredMessages = async (sessionId: string, fallbackText: string): Promise<readonly string[]> => {
  const events = await ChatStorageWorker.getEvents(sessionId)
  const messages = events.filter(isHandleSubmitEvent).map((event) => event.value)
  if (messages.length === 0) {
    return [fallbackText]
  }
  return messages
}
