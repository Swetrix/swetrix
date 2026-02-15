// @ts-ignore
const isDevelopment = window.__SWETRIX_CAPTCHA_DEV || false

const CAPTCHA_SELECTOR = '.swecaptcha'
const SUPPORTED_LOCALES = ['en', 'de', 'fr', 'pl', 'uk'] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
const DEFAULT_LOCALE: SupportedLocale = 'en'
const LIGHT_CAPTCHA_IFRAME_URL = isDevelopment ? './light.html' : 'https://cdn.swetrixcaptcha.com/pages/light'
const DARK_CAPTCHA_IFRAME_URL = isDevelopment ? './dark.html' : 'https://cdn.swetrixcaptcha.com/pages/dark'
const DEFAULT_RESPONSE_INPUT_NAME = 'swetrix-captcha-response'
const MESSAGE_IDENTIFIER = 'swetrix-captcha'
const ID_PREFIX = 'swetrix-captcha-'
const THEMES = ['light', 'dark', 'auto']
const DEFAULT_THEME = 'auto'
const PID_REGEX = /^(?!.*--)[a-zA-Z0-9-]{12}$/

enum LOG_ACTIONS {
  log = 'log',
  error = 'error',
  warn = 'warn',
  info = 'info',
}

const DUMMY_PIDS = ['AP00000000000', 'FAIL000000000']

const isValidPID = (pid: string) => DUMMY_PIDS.includes(pid) || PID_REGEX.test(pid)

const FRAME_HEIGHT = '66px'

const getFrameID = (cid: string) => `${cid}-frame`

const ids: string[] = []

const log = (status: LOG_ACTIONS, text: string) => {
  console[status](`[Swetrix Captcha] ${text}`)
}

const detectPreferredTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
  }

  return 'light'
}

const isSupportedLocale = (locale: string): locale is SupportedLocale => {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

const normalizeLocale = (locale: string): SupportedLocale => {
  const lowered = locale.toLowerCase()
  const primary = lowered.split('-')[0].split('_')[0]

  if (isSupportedLocale(primary)) {
    return primary
  }

  return DEFAULT_LOCALE
}

const detectBrowserLocale = (): SupportedLocale => {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE
  }

  const languages = navigator.languages || [navigator.language]

  for (const lang of languages) {
    const normalized = normalizeLocale(lang)
    if (normalized !== DEFAULT_LOCALE || lang.toLowerCase().startsWith('en')) {
      return normalized
    }
  }

  return DEFAULT_LOCALE
}

const findHtmlLangAttribute = (element: Element): string | null => {
  let current: Element | null = element

  while (current) {
    const lang = current.getAttribute('lang')
    if (lang) {
      return lang
    }
    current = current.parentElement
  }

  return null
}

const detectLanguage = (container: Element): SupportedLocale => {
  // First priority: data-lang attribute on the widget element
  const forcedLang = container.getAttribute('data-lang')
  console.log('forcedLang', forcedLang)
  if (forcedLang) {
    return normalizeLocale(forcedLang)
  }

  // Second priority: lang attribute on ancestor elements (e.g., <html lang="de">)
  const ancestorLang = findHtmlLangAttribute(container.parentElement as Element)
  if (ancestorLang) {
    return normalizeLocale(ancestorLang)
  }

  // Fallback: browser language
  return detectBrowserLocale()
}

const resolveTheme = (theme: string | null): 'light' | 'dark' => {
  if (!theme || theme === 'auto') {
    return detectPreferredTheme()
  }

  return theme as 'light' | 'dark'
}

const appendParamsToURL = (url: string, params: any) => {
  const queryString = Object.keys(params)
    .map((key) => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    })
    .join('&')

  return `${url}?${queryString}`
}

const clearExistingCaptcha = (container: Element) => {
  // Remove existing iframe(s) that belong to this captcha
  const existingFrames = container.querySelectorAll('iframe[id^="swetrix-captcha-"]')
  existingFrames.forEach((frame) => {
    const frameId = frame.id
    // Extract cid from frame id (e.g., "swetrix-captcha-abc123-frame" -> "swetrix-captcha-abc123")
    const cid = frameId.replace('-frame', '')

    // Remove the corresponding hidden input
    const input = container.querySelector(`input[id="${cid}"]`)
    if (input) {
      input.remove()
    }

    // Remove the cid from ids array
    const cidIndex = ids.indexOf(cid)
    if (cidIndex > -1) {
      ids.splice(cidIndex, 1)
    }

    frame.remove()
  })
}

const renderCaptcha = (container: Element, params: any) => {
  // Clear any existing captcha in this container before rendering
  clearExistingCaptcha(container)

  const cid = generateRandomID()
  const cParams = {
    ...params,
    cid, // CAPTCHA ID
  }

  const frame = generateCaptchaFrame(cParams)
  const input = generateHiddenInput(cParams)

  container.appendChild(frame)
  container.appendChild(input)
}

const generateRandomID = (): string => {
  const randomID = ID_PREFIX + Math.random().toString(36).substr(2, 6)

  if (ids.includes(randomID)) {
    return generateRandomID()
  }

  ids.push(randomID)

  return randomID
}

const postMessageCallback = (pmEvent: MessageEvent) => {
  // TODO: Validate origin

  const { data } = pmEvent

  if (!data) {
    return
  }

  const { type, cid, event } = data

  if (type !== MESSAGE_IDENTIFIER) {
    return
  }

  if (!cid || !ids.includes(cid)) {
    return
  }

  const input = document.getElementById(cid)
  const inputExists = input !== null

  switch (event) {
    case 'success': {
      const { token } = data

      if (!inputExists) {
        log(LOG_ACTIONS.error, '[PM -> success] Input element does not exist.')
        return
      }

      // @ts-ignore
      input.value = token

      break
    }

    case 'failure': {
      if (!inputExists) {
        log(LOG_ACTIONS.error, '[PM -> failure] Input element does not exist.')
        return
      }

      // @ts-ignore
      input.value = ''

      break
    }

    case 'tokenExpired': {
      if (!inputExists) {
        log(LOG_ACTIONS.error, '[PM -> failure] Input element does not exist.')
        return
      }

      // @ts-ignore
      input.value = ''

      break
    }
  }
}

const generateCaptchaFrame = (params: any) => {
  const { theme: rawTheme } = params
  const theme = resolveTheme(rawTheme)
  const captchaFrame = document.createElement('iframe')

  captchaFrame.id = getFrameID(params.cid)
  captchaFrame.src =
    theme === 'dark'
      ? appendParamsToURL(DARK_CAPTCHA_IFRAME_URL, params)
      : appendParamsToURL(LIGHT_CAPTCHA_IFRAME_URL, params)
  captchaFrame.style.height = FRAME_HEIGHT
  captchaFrame.title = 'Swetrix Captcha - Human verification'
  captchaFrame.style.border = 'none'
  captchaFrame.style.width = '302px'
  captchaFrame.style.overflow = 'visible'

  captchaFrame.setAttribute('role', 'presentation')
  captchaFrame.setAttribute('aria-label', 'Human verification widget')

  return captchaFrame
}

const generateHiddenInput = (params: any) => {
  const { cid } = params
  const input = document.createElement('input')

  input.type = 'hidden'
  input.name = params.respName
  input.value = ''
  input.id = cid

  input.setAttribute('aria-hidden', 'true')

  return input
}

const validateParams = (params: any) => {
  const { theme, pid } = params

  if (theme && !THEMES.includes(theme)) {
    log(LOG_ACTIONS.error, `Invalid data-theme parameter: ${theme}. Valid options are: ${THEMES.join(', ')}`)
    return false
  }

  if (!pid || !isValidPID(pid)) {
    log(LOG_ACTIONS.error, `Invalid data-project-id parameter: ${pid}`)
    return false
  }

  return true
}

const parseParams = (container: Element): object => {
  const params: Record<string, string | null> = {
    pid: container.getAttribute('data-project-id'),
    respName: container.getAttribute('data-response-input-name') || DEFAULT_RESPONSE_INPUT_NAME,
    theme: container.getAttribute('data-theme') || DEFAULT_THEME,
    lang: detectLanguage(container),
  }

  // Optional custom API URL
  const apiUrl = container.getAttribute('data-api-url')
  if (apiUrl) {
    params.apiUrl = apiUrl
  }

  return params
}

const main = (forced = false) => {
  if (!forced && 'swecaptcha' in window) {
    log(LOG_ACTIONS.warn, 'Captcha is already loaded.')
  }

  // TODO: Add some callbacks here
  // @ts-ignore
  window.swecaptcha = true
  window.addEventListener('message', postMessageCallback)

  const containers = Array.from(document.querySelectorAll(CAPTCHA_SELECTOR))

  for (const container of containers) {
    const params = parseParams(container)

    if (!validateParams(params)) {
      log(LOG_ACTIONS.error, 'Aborting captcha rendering due to invalid parameters.')
      return
    }

    renderCaptcha(container, params)
  }
}

// @ts-ignore
window.swetrixCaptchaForceLoad = () => main(true)

document.addEventListener('DOMContentLoaded', () => main())
