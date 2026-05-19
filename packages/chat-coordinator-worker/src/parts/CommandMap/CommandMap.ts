import { createSession } from '../CreateSession/CreateSession.ts'
import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { handleSubmit } from '../HandleSubmit/HandleSubmit.ts'
import { mockBackendSetHttpErrorResponse } from '../MockBackendSetHttpErrorResponse/MockBackendSetHttpErrorResponse.ts'
import { mockBackendSetResponse } from '../MockBackendSetResponse/MockBackendSetResponse.ts'
import { mockOpenApiSetResponse } from '../MockOpenApiSetResponse/MockOpenApiSetResponse.ts'
import * as MockOpenApiStream from '../MockOpenApiStream/MockOpenApiStream.ts'
import { registerMockResponse } from '../RegisterMockResponse/RegisterMockResponse.ts'

export const commandMap = {
  'ChatCoordinator.createSession': createSession,
  'ChatCoordinator.handleSubmit': handleSubmit,
  'ChatCoordinator.mockBackendSetHttpErrorResponse': mockBackendSetHttpErrorResponse,
  'ChatCoordinator.mockBackendSetResponse': mockBackendSetResponse,
  'ChatCoordinator.mockOpenApiSetResponse': mockOpenApiSetResponse,
  'ChatCoordinator.mockOpenApiStreamFinish': MockOpenApiStream.finish,
  'ChatCoordinator.mockOpenApiStreamPushChunk': MockOpenApiStream.pushChunk,
  'ChatCoordinator.mockOpenApiStreamReset': MockOpenApiStream.reset,
  'ChatCoordinator.registerMockResponse': registerMockResponse,
  'ChatCoordinator.submit': handleSubmit,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
  initialize: (_: string, port: MessagePort): Promise<void> => handleMessagePort(port),
}
