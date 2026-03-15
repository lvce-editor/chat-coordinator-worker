export const getCommandHelpText = (): string => {
  return [
    'Available commands:',
    '/new - Create and switch to a new chat session.',
    '/clear - Clear messages in the selected chat session.',
    '/export - Export current chat session as Markdown.',
    '/help - Show this help.',
  ].join('\n')
}
