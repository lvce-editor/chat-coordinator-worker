export const openApiApiKeyRequiredMessage = 'OpenAI API key is not configured. Enter your OpenAI API key below and click Save.'

export const openApiRequestFailedMessage = 'OpenAI request failed.'

export const openApiRequestFailedOfflineMessage = 'OpenAI request failed because you are offline. Please check your internet connection.'

export const openRouterApiKeyRequiredMessage = 'OpenRouter API key is not configured. Enter your OpenRouter API key below and click Save.'

export const openRouterRequestFailedMessage = 'OpenRouter request failed. Possible reasons:'

export const openRouterTooManyRequestsMessage = 'OpenRouter rate limit reached (429). Please try again soon. Helpful tips:'

export const openRouterRequestFailureReasons = [
  'ContentSecurityPolicyViolation: Check DevTools for details.',
  'OpenRouter server offline: Check DevTools for details.',
  'Check your internet connection.',
] as const

export const openRouterTooManyRequestsReasons = [
  'Wait a short time and retry your request.',
  'Reduce request frequency to avoid rate limits.',
  'Use a different model if this one is saturated.',
] as const
