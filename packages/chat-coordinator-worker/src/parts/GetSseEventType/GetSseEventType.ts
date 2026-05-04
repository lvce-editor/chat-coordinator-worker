export const getSseEventType = (value: unknown): 'sse-response-completed' | 'sse-response-part' => {
  return value && typeof value === 'object' && Reflect.get(value, 'type') === 'response.completed' ? 'sse-response-completed' : 'sse-response-part'
}
