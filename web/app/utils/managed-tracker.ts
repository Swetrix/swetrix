import {
  API_URL,
  isBrowser,
  isSelfhosted,
  isStaging,
  MAIN_URL,
} from '~/lib/constants'

const instanceURL = isBrowser
  ? window.REMIX_ENV?.BASE_URL
  : process.env.BASE_URL
export const TRACKER_SCRIPT_ORIGIN: string =
  isSelfhosted || isStaging ? (instanceURL || '').replace(/\/$/, '') : MAIN_URL

export const PUBLIC_TRACKER_LOG_URL = isSelfhosted
  ? `${TRACKER_SCRIPT_ORIGIN}/backend/v1/log`
  : isStaging
    ? `${API_URL}log`
    : 'https://api.swetrix.com/log'

export const getManagedTrackingSnippet = (pid: string) =>
  `<script defer crossorigin="anonymous" src="${TRACKER_SCRIPT_ORIGIN}/p/${encodeURIComponent(pid)}.js"></script>`
