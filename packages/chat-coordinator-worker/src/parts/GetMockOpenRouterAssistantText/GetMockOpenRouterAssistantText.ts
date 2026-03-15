import type { ChatMessage } from '../ChatState/ChatState.ts'
import * as ExtensionHostShared from '../ExtensionHost/ExtensionHostShared.ts'
import { CommandExecute } from '../ExtensionHostCommandType/ExtensionHostCommandType.ts'
import {
  type GetOpenRouterAssistantTextErrorResult,
  type GetOpenRouterAssistantTextSuccessResult,
} from '../GetOpenRouterAssistantText/GetOpenRouterAssistantText.ts'
import { normalizeMockResult } from '../NormalizeMockResult/NormalizeMockResult.ts'

export const getMockOpenRouterAssistantText = async (
  messages: readonly ChatMessage[],
  modelId: string,
  openRouterApiBaseUrl: string,
  openRouterApiKey: string,
  mockApiCommandId: string,
  assetDir: string,
  platform: number,
): Promise<GetOpenRouterAssistantTextSuccessResult | GetOpenRouterAssistantTextErrorResult> => {
  if (!mockApiCommandId) {
    return {
      details: 'request-failed',
      type: 'error',
    }
  }
  try {
    const result = await ExtensionHostShared.executeProvider({
      assetDir,
      event: `onCommand:${mockApiCommandId}`,
      method: CommandExecute,
      noProviderFoundMessage: 'No mock api command found',
      params: [
        mockApiCommandId,
        {
          messages,
          modelId,
          openRouterApiBaseUrl,
          openRouterApiKey,
        },
      ],
      platform,
    })
    return normalizeMockResult(result)
  } catch {
    return {
      details: 'request-failed',
      type: 'error',
    }
  }
}
