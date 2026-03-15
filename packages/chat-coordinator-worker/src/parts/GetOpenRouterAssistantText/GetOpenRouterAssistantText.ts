import type { ChatMessage } from '../ChatMessage/ChatMessage.ts'
import { makeApiRequest } from '../ChatNetworkRequest/ChatNetworkRequest.ts'
import { executeChatTool, getBasicChatTools } from '../ChatTools/ChatTools.ts'
import { getClientRequestIdHeader } from '../GetClientRequestIdHeader/GetClientRequestIdHeader.ts'
import { getOpenRouterApiEndpoint } from '../GetOpenRouterApiEndpoint/GetOpenRouterApiEndpoint.ts'
import { getOpenRouterKeyEndpoint } from '../GetOpenRouterKeyEndpoint/GetOpenRouterKeyEndpoint.ts'
import { getTextContent } from '../GetTextContent/GetTextContent.ts'

export interface GetOpenRouterAssistantTextSuccessResult {
  readonly text: string
  readonly type: 'success'
}

export interface GetOpenRouterAssistantTextErrorResult {
  readonly details: 'request-failed' | 'too-many-requests' | 'http-error'
  readonly limitInfo?: {
    readonly limitRemaining?: number | null
    readonly limitReset?: string | null
    readonly retryAfter?: string | null
    readonly usage?: number
    readonly usageDaily?: number
  }
  readonly rawMessage?: string
  readonly statusCode?: number
  readonly type: 'error'
}

export type GetOpenRouterAssistantTextResult = GetOpenRouterAssistantTextSuccessResult | GetOpenRouterAssistantTextErrorResult

const getOpenRouterRaw429Message = async (response: Response): Promise<string | undefined> => {
  let parsed: unknown
  try {
    parsed = (await response.json()) as unknown
  } catch {
    return undefined
  }

  if (!parsed || typeof parsed !== 'object') {
    return undefined
  }

  const error = Reflect.get(parsed, 'error')
  if (!error || typeof error !== 'object') {
    return undefined
  }

  const metadata = Reflect.get(error, 'metadata')
  if (!metadata || typeof metadata !== 'object') {
    return undefined
  }

  const raw = Reflect.get(metadata, 'raw')
  if (typeof raw !== 'string' || !raw) {
    return undefined
  }

  return raw
}

const getOpenRouterRaw429MessageFromText = (responseText: string): string | undefined => {
  let parsed: unknown
  try {
    parsed = JSON.parse(responseText) as unknown
  } catch {
    return undefined
  }

  if (!parsed || typeof parsed !== 'object') {
    return undefined
  }

  const error = Reflect.get(parsed, 'error')
  if (!error || typeof error !== 'object') {
    return undefined
  }

  const metadata = Reflect.get(error, 'metadata')
  if (!metadata || typeof metadata !== 'object') {
    return undefined
  }

  const raw = Reflect.get(metadata, 'raw')
  if (typeof raw !== 'string' || !raw) {
    return undefined
  }

  return raw
}

const getOpenRouterLimitInfo = async (
  openRouterApiKey: string,
  openRouterApiBaseUrl: string,
  useChatNetworkWorkerForRequests: boolean,
): Promise<GetOpenRouterAssistantTextErrorResult['limitInfo'] | undefined> => {
  let parsed: unknown
  if (useChatNetworkWorkerForRequests) {
    const result = await makeApiRequest({
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        ...getClientRequestIdHeader(),
      },
      method: 'GET',
      url: getOpenRouterKeyEndpoint(openRouterApiBaseUrl),
    })
    if (result.type === 'error') {
      return undefined
    }
    parsed = result.body
  } else {
    let response: Response
    try {
      response = await fetch(getOpenRouterKeyEndpoint(openRouterApiBaseUrl), {
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          ...getClientRequestIdHeader(),
        },
        method: 'GET',
      })
    } catch {
      return undefined
    }

    if (!response.ok) {
      return undefined
    }

    try {
      parsed = (await response.json()) as unknown
    } catch {
      return undefined
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return undefined
  }

  const data = Reflect.get(parsed, 'data')
  if (!data || typeof data !== 'object') {
    return undefined
  }

  const limitRemaining = Reflect.get(data, 'limit_remaining')
  const limitReset = Reflect.get(data, 'limit_reset')
  const usage = Reflect.get(data, 'usage')
  const usageDaily = Reflect.get(data, 'usage_daily')
  const normalizedLimitInfo = {
    ...(typeof limitRemaining === 'number' || limitRemaining === null
      ? {
          limitRemaining,
        }
      : {}),
    ...(typeof limitReset === 'string' || limitReset === null
      ? {
          limitReset,
        }
      : {}),
    ...(typeof usage === 'number'
      ? {
          usage,
        }
      : {}),
    ...(typeof usageDaily === 'number'
      ? {
          usageDaily,
        }
      : {}),
  }

  const hasLimitInfo =
    normalizedLimitInfo.limitRemaining !== undefined ||
    normalizedLimitInfo.limitReset !== undefined ||
    normalizedLimitInfo.usage !== undefined ||
    normalizedLimitInfo.usageDaily !== undefined

  if (!hasLimitInfo) {
    return undefined
  }

  return normalizedLimitInfo
}

export const getOpenRouterAssistantText = async (
  messages: readonly ChatMessage[],
  modelId: string,
  openRouterApiKey: string,
  openRouterApiBaseUrl: string,
  assetDir: string,
  platform: number,
  useChatNetworkWorkerForRequests = false,
): Promise<GetOpenRouterAssistantTextResult> => {
  const completionMessages: any[] = messages.map((message) => ({
    content: message.text,
    role: message.role,
  }))
  const tools = getBasicChatTools()
  const maxToolIterations = 4
  for (let i = 0; i <= maxToolIterations; i++) {
    let parsed: unknown
    if (useChatNetworkWorkerForRequests) {
      const requestResult = await makeApiRequest({
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          ...getClientRequestIdHeader(),
        },
        method: 'POST',
        postBody: {
          messages: completionMessages,
          model: modelId,
          tool_choice: 'auto',
          tools,
        },
        url: getOpenRouterApiEndpoint(openRouterApiBaseUrl),
      })
      if (requestResult.type === 'error') {
        if (requestResult.statusCode === 429) {
          const retryAfter = requestResult.headers?.['retry-after'] ?? null
          const rawMessage = getOpenRouterRaw429MessageFromText(requestResult.response)
          const limitInfo = await getOpenRouterLimitInfo(openRouterApiKey, openRouterApiBaseUrl, useChatNetworkWorkerForRequests)
          return {
            details: 'too-many-requests',
            ...(limitInfo || retryAfter
              ? {
                  limitInfo: {
                    ...limitInfo,
                    ...(retryAfter
                      ? {
                          retryAfter,
                        }
                      : {}),
                  },
                }
              : {}),
            ...(rawMessage
              ? {
                  rawMessage,
                }
              : {}),
            statusCode: 429,
            type: 'error',
          }
        }
        return {
          details: 'http-error',
          statusCode: requestResult.statusCode,
          type: 'error',
        }
      }
      parsed = requestResult.body
    } else {
      let response: Response
      try {
        response = await fetch(getOpenRouterApiEndpoint(openRouterApiBaseUrl), {
          body: JSON.stringify({
            messages: completionMessages,
            model: modelId,
            tool_choice: 'auto',
            tools,
          }),
          headers: {
            Authorization: `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            ...getClientRequestIdHeader(),
          },
          method: 'POST',
        })
      } catch {
        return {
          details: 'request-failed',
          type: 'error',
        }
      }

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers?.get?.('retry-after') ?? null
          const rawMessage = await getOpenRouterRaw429Message(response)
          const limitInfo = await getOpenRouterLimitInfo(openRouterApiKey, openRouterApiBaseUrl, useChatNetworkWorkerForRequests)
          return {
            details: 'too-many-requests',
            ...(limitInfo || retryAfter
              ? {
                  limitInfo: {
                    ...limitInfo,
                    ...(retryAfter
                      ? {
                          retryAfter,
                        }
                      : {}),
                  },
                }
              : {}),
            ...(rawMessage
              ? {
                  rawMessage,
                }
              : {}),
            statusCode: 429,
            type: 'error',
          }
        }
        return {
          details: 'http-error',
          statusCode: response.status,
          type: 'error',
        }
      }

      try {
        parsed = (await response.json()) as unknown
      } catch {
        return {
          details: 'request-failed',
          type: 'error',
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        text: '',
        type: 'success',
      }
    }
    const choices = Reflect.get(parsed, 'choices')
    if (!Array.isArray(choices)) {
      return {
        text: '',
        type: 'success',
      }
    }
    const firstChoice = choices[0]
    if (!firstChoice || typeof firstChoice !== 'object') {
      return {
        text: '',
        type: 'success',
      }
    }
    const message = Reflect.get(firstChoice, 'message')
    if (!message || typeof message !== 'object') {
      return {
        text: '',
        type: 'success',
      }
    }

    const toolCalls = Reflect.get(message, 'tool_calls')
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      completionMessages.push(message)
      for (const toolCall of toolCalls) {
        if (!toolCall || typeof toolCall !== 'object') {
          continue
        }
        const id = Reflect.get(toolCall, 'id')
        const toolFunction = Reflect.get(toolCall, 'function')
        if (typeof id !== 'string' || !toolFunction || typeof toolFunction !== 'object') {
          continue
        }
        const name = Reflect.get(toolFunction, 'name')
        const rawArguments = Reflect.get(toolFunction, 'arguments')
        const content = typeof name === 'string' ? await executeChatTool(name, rawArguments, { assetDir, platform }) : '{}'
        completionMessages.push({
          content,
          role: 'tool',
          tool_call_id: id,
        })
      }
      continue
    }

    const content = Reflect.get(message, 'content')
    return {
      text: getTextContent(content),
      type: 'success',
    }
  }

  return {
    details: 'request-failed',
    type: 'error',
  }
}
