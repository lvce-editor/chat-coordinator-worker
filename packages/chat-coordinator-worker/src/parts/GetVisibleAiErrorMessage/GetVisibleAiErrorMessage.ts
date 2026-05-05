const getStatusCodeMessage = (statusCode: number): string => {
  switch (statusCode) {
    case 401:
      return 'The AI request was rejected. Check the API key and try again.'
    case 403:
      return 'The AI request was rejected. Check your permissions and try again.'
    case 408:
      return 'The AI request timed out. Please try again.'
    case 429:
      return 'The AI request was rate limited. Please try again.'
    default:
      if (statusCode >= 500) {
        return 'The AI provider is temporarily unavailable. Please try again.'
      }
      return 'The AI request failed. Please try again.'
  }
}

export const getVisibleAiErrorMessage = (_error: unknown, statusCode?: number): string => {
  if (typeof statusCode === 'number') {
    return getStatusCodeMessage(statusCode)
  }
  return 'The AI request failed. Please try again.'
}
