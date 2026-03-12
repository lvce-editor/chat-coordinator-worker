import { handleMessagePort } from '../HandleMessagePort/HandleMessagePort.ts'
import * as CoordinatorCommands from '../CoordinatorCommands/CoordinatorCommands.ts'
import * as NetworkCommandMap from './NetworkCommandMap.ts'

export const commandMap = {
  ...NetworkCommandMap.networkCommandMap,
  'chatCoordinator.consumeEvents': CoordinatorCommands.consumeEvents,
  'chatCoordinator.createSession': CoordinatorCommands.createSession,
  'chatCoordinator.deleteSession': CoordinatorCommands.deleteSession,
  'chatCoordinator.getSession': CoordinatorCommands.getSession,
  'chatCoordinator.listSessions': CoordinatorCommands.listSessions,
  'chatCoordinator.submit': CoordinatorCommands.submit,
  'chatCoordinator.subscribe': CoordinatorCommands.subscribe,
  'chatCoordinator.unsubscribe': CoordinatorCommands.unsubscribe,
  'HandleMessagePort.handleMessagePort': handleMessagePort,
}
