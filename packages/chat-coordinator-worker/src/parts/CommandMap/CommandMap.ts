import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { handleSubmit } from '../HandleSubmit/HandleSubmit.ts'

export const commandMap = {
  'ChatCoordinator.handleSubmit': handleSubmit,
  'ChatCoordinator.submit': handleSubmit,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
  initialize: (_: string, port: MessagePort): Promise<void> => handleMessagePort(port),
}
