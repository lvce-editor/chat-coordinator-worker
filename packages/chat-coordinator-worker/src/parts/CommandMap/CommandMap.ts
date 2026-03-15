import * as CoordinatorCommands from '../CoordinatorCommands/CoordinatorCommands.ts'
import { getAiSessionTitle } from '../GetAiSessionTitle/GetAiSessionTitle.ts'
import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'

export const commandMap = {
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
