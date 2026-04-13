import * as CoordinatorCommands from '../CoordinatorCommands/CoordinatorCommands.ts'
import { getAiResponse } from '../GetAiResponse/GetAiResponse.ts'
import { getAiSessionTitle } from '../GetAiSessionTitle/GetAiSessionTitle.ts'
import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import { mockOpenApiRequestGetAll } from '../MockOpenApiRequestGetAll/MockOpenApiRequestGetAll.ts'
import { mockOpenApiRequestReset } from '../MockOpenApiRequestReset/MockOpenApiRequestReset.ts'
import { mockOpenApiSetHttpErrorResponse } from '../MockOpenApiSetHttpErrorResponse/MockOpenApiSetHttpErrorResponse.ts'
import { mockOpenApiStreamFinish } from '../MockOpenApiStreamFinish/MockOpenApiStreamFinish.ts'
import { mockOpenApiStreamPushChunk } from '../MockOpenApiStreamPushChunk/MockOpenApiStreamPushChunk.ts'
import { mockOpenApiStreamReset } from '../MockOpenApiStreamReset/MockOpenApiStreamReset.ts'

export const commandMap = {
  'ChatCoordinator.cancelRun': CoordinatorCommands.cancelRun,
  'ChatCoordinator.consumeEvents': CoordinatorCommands.consumeEvents,
  'ChatCoordinator.createSession': CoordinatorCommands.createSession,
  'ChatCoordinator.deleteSession': CoordinatorCommands.deleteSession,
  'ChatCoordinator.executeToolByName': CoordinatorCommands.executeToolByName,
  'ChatCoordinator.getAiResponse': getAiResponse,
  'ChatCoordinator.getAiSessionTitle': getAiSessionTitle,
  'ChatCoordinator.getSession': CoordinatorCommands.getSession,
  'ChatCoordinator.getTools': CoordinatorCommands.getTools,
  'ChatCoordinator.listSessions': CoordinatorCommands.listSessions,
  'ChatCoordinator.mockOpenApiRequestGetAll': mockOpenApiRequestGetAll,
  'ChatCoordinator.mockOpenApiRequestReset': mockOpenApiRequestReset,
  'ChatCoordinator.mockOpenApiSetHttpErrorResponse': mockOpenApiSetHttpErrorResponse,
  'ChatCoordinator.mockOpenApiStreamFinish': mockOpenApiStreamFinish,
  'ChatCoordinator.mockOpenApiStreamPushChunk': mockOpenApiStreamPushChunk,
  'ChatCoordinator.mockOpenApiStreamReset': mockOpenApiStreamReset,
  'ChatCoordinator.parseMessageContent': CoordinatorCommands.parseMessageContent,
  'ChatCoordinator.parseMessageContents': CoordinatorCommands.parseMessageContents,
  'ChatCoordinator.submit': CoordinatorCommands.submit,
  'ChatCoordinator.subscribe': CoordinatorCommands.subscribe,
  'ChatCoordinator.unsubscribe': CoordinatorCommands.unsubscribe,
  'ChatCoordinator.waitForEvents': CoordinatorCommands.waitForEvents,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
  initialize: (_: string, port: MessagePort): Promise<void> => handleMessagePort(port),
}
