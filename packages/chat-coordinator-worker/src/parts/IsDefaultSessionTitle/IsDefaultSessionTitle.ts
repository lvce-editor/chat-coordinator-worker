export const isDefaultSessionTitle = (title: string): boolean => {
  return /^Chat \d+$/.test(title)
}
