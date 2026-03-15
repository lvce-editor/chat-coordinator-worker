import type { ExecuteToolOptions } from '../Types/Types.ts'

const maxPayloadLength = 40_000

export const executeRenderHtmlTool = async (args: Readonly<Record<string, unknown>>, _options: ExecuteToolOptions): Promise<string> => {
  const html = typeof args.html === 'string' ? args.html : ''
  const css = typeof args.css === 'string' ? args.css : ''
  const title = typeof args.title === 'string' ? args.title : ''

  if (!html) {
    return JSON.stringify({ error: 'Missing required argument: html' })
  }

  if (html.length > maxPayloadLength || css.length > maxPayloadLength) {
    return JSON.stringify({ error: 'Payload too large: keep html/css under 40,000 characters each.' })
  }

  return JSON.stringify({
    css,
    html,
    ok: true,
    title,
  })
}
