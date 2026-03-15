import * as CoordinatorCommands from '../CoordinatorCommands/CoordinatorCommands.ts'
import { getAiSessionTitle } from '../GetAiSessionTitle/GetAiSessionTitle.ts'
import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { mockOpenApiRequestGetAll } from '../MockOpenApiRequestGetAll/MockOpenApiRequestGetAll.ts'
import { mockOpenApiRequestReset } from '../MockOpenApiRequestReset/MockOpenApiRequestReset.ts'
import { mockOpenApiSetHttpErrorResponse } from '../MockOpenApiSetHttpErrorResponse/MockOpenApiSetHttpErrorResponse.ts'
import { mockOpenApiStreamFinish } from '../MockOpenApiStreamFinish/MockOpenApiStreamFinish.ts'
import { mockOpenApiStreamPushChunk } from '../MockOpenApiStreamPushChunk/MockOpenApiStreamPushChunk.ts'
import { mockOpenApiStreamReset } from '../MockOpenApiStreamReset/MockOpenApiStreamReset.ts'

export const commandMap = {
  'Chat.mockOpenApiRequestGetAll': mockOpenApiRequestGetAll,
  'Chat.mockOpenApiRequestReset': mockOpenApiRequestReset,
  'Chat.mockOpenApiSetHttpErrorResponse': mockOpenApiSetHttpErrorResponse,
  'Chat.mockOpenApiStreamFinish': mockOpenApiStreamFinish,
  'Chat.mockOpenApiStreamPushChunk': mockOpenApiStreamPushChunk,
  'Chat.mockOpenApiStreamReset': mockOpenApiStreamReset,
  'ChatCoordinator.cancelRun': CoordinatorCommands.cancelRun,
  'ChatCoordinator.consumeEvents': CoordinatorCommands.consumeEvents,
  'ChatCoordinator.createSession': CoordinatorCommands.createSession,
  'ChatCoordinator.deleteSession': CoordinatorCommands.deleteSession,
  'ChatCoordinator.getAiSessionTitle': getAiSessionTitle,
  'ChatCoordinator.getSession': CoordinatorCommands.getSession,
  'ChatCoordinator.listSessions': CoordinatorCommands.listSessions,
  'ChatCoordinator.submit': CoordinatorCommands.submit,
  'ChatCoordinator.subscribe': CoordinatorCommands.subscribe,
  'ChatCoordinator.unsubscribe': CoordinatorCommands.unsubscribe,
  'ChatCoordinator.waitForEvents': CoordinatorCommands.waitForEvents,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
}
