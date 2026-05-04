import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { handleSubmit } from '../HandleSubmit/HandleSubmit.ts'
import { registerMockResponse } from '../RegisterMockResponse/RegisterMockResponse.ts'

export const commandMap = {
  'ChatCoordinator.handleSubmit': handleSubmit,
  'ChatCoordinator.registerMockResponse': registerMockResponse,
  'ChatCoordinator.submit': handleSubmit,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
  initialize: (_: string, port: MessagePort): Promise<void> => handleMessagePort(port),
}
