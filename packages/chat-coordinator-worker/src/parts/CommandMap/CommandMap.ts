import * as CoordinatorCommands from '../CoordinatorCommands/CoordinatorCommands.ts'
import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'

export const commandMap = {
  'chatCoordinator.cancelRun': CoordinatorCommands.cancelRun,
  'chatCoordinator.consumeEvents': CoordinatorCommands.consumeEvents,
  'chatCoordinator.createSession': CoordinatorCommands.createSession,
  'chatCoordinator.deleteSession': CoordinatorCommands.deleteSession,
  'chatCoordinator.getSession': CoordinatorCommands.getSession,
  'chatCoordinator.listSessions': CoordinatorCommands.listSessions,
  'chatCoordinator.submit': CoordinatorCommands.submit,
  'chatCoordinator.subscribe': CoordinatorCommands.subscribe,
  'chatCoordinator.unsubscribe': CoordinatorCommands.unsubscribe,
  'chatCoordinator.waitForEvents': CoordinatorCommands.waitForEvents,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
}
