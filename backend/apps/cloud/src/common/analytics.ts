import { Swetrix, type TrackEventOptions } from '@swetrix/node'
import { isDevelopment } from './constants'

const swetrix = new Swetrix(process.env.SWETRIX_PID, {
  // Same port as in main.ts
  apiURL: 'http://localhost:5005/log',
  devMode: isDevelopment,
})

export const trackCustom = async (
  ip: string,
  userAgent: string,
  options: TrackEventOptions,
) => {
  try {
    await swetrix.track(ip, userAgent, options)
  } catch (reason) {
    console.error('[ERROR] Failed to track custom event:', reason)
  }
}
