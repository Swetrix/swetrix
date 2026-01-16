const PREFIX = '[Swetrix Captcha]'

export const logger = {
  log: (...args: unknown[]) => console.log(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, ...args),
  info: (...args: unknown[]) => console.info(PREFIX, ...args),
} as const
