import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { handleSubmit } from '../HandleSubmit/HandleSubmit.ts'
import { mockBackendSetHttpErrorResponse } from '../MockBackendSetHttpErrorResponse/MockBackendSetHttpErrorResponse.ts'
import { mockBackendSetResponse } from '../MockBackendSetResponse/MockBackendSetResponse.ts'
import { registerMockResponse } from '../RegisterMockResponse/RegisterMockResponse.ts'

export const commandMap = {
  'ChatCoordinator.handleSubmit': handleSubmit,
  'ChatCoordinator.mockBackendSetHttpErrorResponse': mockBackendSetHttpErrorResponse,
  'ChatCoordinator.mockBackendSetResponse': mockBackendSetResponse,
  'ChatCoordinator.registerMockResponse': registerMockResponse,
  'ChatCoordinator.submit': handleSubmit,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
  initialize: (_: string, port: MessagePort): Promise<void> => handleMessagePort(port),
}
