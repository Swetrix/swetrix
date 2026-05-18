const CAPTCHA_SELECTOR = '.swecaptcha'
const SUPPORTED_LOCALES = ['en', 'de', 'fr', 'pl', 'uk', 'hu'] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
const DEFAULT_LOCALE: SupportedLocale = 'en'
const DEFAULT_ASSET_BASE_URL = 'https://cdn.swetrixcaptcha.com/dist/'
const DEFAULT_RESPONSE_INPUT_NAME = 'swetrix-captcha-response'
const MESSAGE_IDENTIFIER = 'swetrix-captcha'
const ID_PREFIX = 'swetrix-captcha-'
const THEMES = ['light', 'dark', 'auto'] as const
const DEFAULT_THEME = 'auto'
const PID_REGEX = /^(?!.*--)[a-zA-Z0-9-]{12}$/
const SCRIPT_NAME_REGEX = /(?:^|\/)captcha-loader(?:\.[\w-]+)?\.js(?:[?#]|$)/
const LEGACY_CDN_HOST = 'cdn.swetrixcaptcha.com'

declare global {
  interface Window {
    __SWETRIX_CAPTCHA_ASSET_URL?: string
    __SWETRIX_CAPTCHA_DEV?: boolean
    swecaptcha?: boolean
    swetrixCaptchaForceLoad?: () => void
  }
}

enum LOG_ACTIONS {
  log = 'log',
  error = 'error',
  warn = 'warn',
  info = 'info',
}

interface CaptchaParams {
  pid: string | null
  respName: string
  theme: string
  lang: SupportedLocale
  assetBaseUrl: string
  apiUrl?: string
}

type CaptchaFrameParams = CaptchaParams & {
  cid: string
}

type CaptchaQueryParams = Record<string, string | null | undefined>

const DUMMY_PIDS = ['AP00000000000', 'FAIL000000000']

const isValidPID = (pid: string) => DUMMY_PIDS.includes(pid) || PID_REGEX.test(pid)

const FRAME_HEIGHT = '66px'

const getFrameID = (cid: string) => `${cid}-frame`

const ids: string[] = []

let messageListenerRegistered = false

const log = (status: LOG_ACTIONS, text: string) => {
  console[status](`[Swetrix Captcha] ${text}`)
}

const getWindow = () => (typeof window === 'undefined' ? undefined : window)

const getDocument = () => (typeof document === 'undefined' ? undefined : document)

const normalizeAssetBaseURL = (assetBaseUrl: string) => {
  const fallbackBase = getWindow()?.location.href

  try {
    const url = fallbackBase ? new URL(assetBaseUrl, fallbackBase) : new URL(assetBaseUrl)
    return url.href.endsWith('/') ? url.href : `${url.href}/`
  } catch {
    return DEFAULT_ASSET_BASE_URL
  }
}

const getScriptAssetBaseURL = () => {
  const doc = getDocument()
  if (!doc) {
    return DEFAULT_ASSET_BASE_URL
  }

  const currentScript = doc.currentScript as HTMLScriptElement | null
  const scripts = [
    ...(currentScript?.src ? [currentScript] : []),
    ...Array.from(doc.scripts).reverse(),
  ]
  const loaderScript = scripts.find((script) => SCRIPT_NAME_REGEX.test(script.src))

  if (!loaderScript?.src) {
    return DEFAULT_ASSET_BASE_URL
  }

  if (new URL(loaderScript.src).hostname === LEGACY_CDN_HOST) {
    return DEFAULT_ASSET_BASE_URL
  }

  return normalizeAssetBaseURL(new URL('.', loaderScript.src).href)
}

const resolveAssetBaseURL = (container: Element) => {
  const configuredAssetBaseURL =
    container.getAttribute('data-asset-url') ||
    container.getAttribute('data-assets-url') ||
    getWindow()?.__SWETRIX_CAPTCHA_ASSET_URL

  return normalizeAssetBaseURL(configuredAssetBaseURL || getScriptAssetBaseURL())
}

const detectPreferredTheme = (): 'light' | 'dark' => {
  const win = getWindow()
  if (win?.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
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

const findHtmlLangAttribute = (element: Element | null): string | null => {
  let current = element

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
  const forcedLang = container.getAttribute('data-lang')
  if (forcedLang) {
    return normalizeLocale(forcedLang)
  }

  const ancestorLang = findHtmlLangAttribute(container.parentElement)
  if (ancestorLang) {
    return normalizeLocale(ancestorLang)
  }

  return detectBrowserLocale()
}

const resolveTheme = (theme: string): 'light' | 'dark' => {
  if (theme === 'light' || theme === 'dark') {
    return theme
  }

  return detectPreferredTheme()
}

const appendParamsToURL = (url: string, params: CaptchaQueryParams) => {
  const urlObject = new URL(url, getWindow()?.location.href)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      urlObject.searchParams.set(key, value)
    }
  })

  return urlObject.toString()
}

const clearExistingCaptcha = (container: Element) => {
  const existingFrames = container.querySelectorAll('iframe[id^="swetrix-captcha-"]')
  existingFrames.forEach((frame) => {
    const cid = frame.id.replace('-frame', '')
    const input = container.querySelector(`input[id="${cid}"]`)

    input?.remove()

    const cidIndex = ids.indexOf(cid)
    if (cidIndex > -1) {
      ids.splice(cidIndex, 1)
    }

    frame.remove()
  })
}

const renderCaptcha = (container: Element, params: CaptchaParams) => {
  clearExistingCaptcha(container)

  const cParams = {
    ...params,
    cid: generateRandomID(),
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
  const data = pmEvent.data as { type?: string; cid?: string; event?: string; token?: string } | null

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

  const input = getDocument()?.getElementById(cid) as HTMLInputElement | null
  const inputExists = input !== null

  switch (event) {
    case 'success': {
      const { token } = data

      if (!inputExists) {
        log(LOG_ACTIONS.error, '[PM -> success] Input element does not exist.')
        return
      }

      input.value = token || ''

      break
    }

    case 'failure':
    case 'tokenExpired': {
      if (!inputExists) {
        log(LOG_ACTIONS.error, '[PM -> failure] Input element does not exist.')
        return
      }

      input.value = ''

      break
    }
  }
}

const generateCaptchaFrame = (params: CaptchaFrameParams) => {
  const { assetBaseUrl, cid, theme: rawTheme, ...queryParams } = params
  const theme = resolveTheme(rawTheme)
  const captchaFrame = document.createElement('iframe')
  const captchaPage = theme === 'dark' ? 'pages/dark.html' : 'pages/light.html'

  captchaFrame.id = getFrameID(cid)
  captchaFrame.src = appendParamsToURL(new URL(captchaPage, assetBaseUrl).toString(), {
    ...queryParams,
    cid,
    theme: rawTheme,
  })
  captchaFrame.style.height = FRAME_HEIGHT
  captchaFrame.title = 'Swetrix Captcha - Human verification'
  captchaFrame.style.border = 'none'
  captchaFrame.style.width = '302px'
  captchaFrame.style.overflow = 'visible'

  captchaFrame.setAttribute('role', 'presentation')
  captchaFrame.setAttribute('aria-label', 'Human verification widget')

  return captchaFrame
}

const generateHiddenInput = (params: CaptchaFrameParams) => {
  const { cid } = params
  const input = document.createElement('input')

  input.type = 'hidden'
  input.name = params.respName
  input.value = ''
  input.id = cid

  input.setAttribute('aria-hidden', 'true')

  return input
}

const validateParams = (params: CaptchaParams) => {
  const { theme, pid } = params

  if (theme && !THEMES.includes(theme as (typeof THEMES)[number])) {
    log(LOG_ACTIONS.error, `Invalid data-theme parameter: ${theme}. Valid options are: ${THEMES.join(', ')}`)
    return false
  }

  if (!pid || !isValidPID(pid)) {
    log(LOG_ACTIONS.error, `Invalid data-project-id parameter: ${pid}`)
    return false
  }

  return true
}

const parseParams = (container: Element): CaptchaParams => {
  const params: CaptchaParams = {
    pid: container.getAttribute('data-project-id'),
    respName: container.getAttribute('data-response-input-name') || DEFAULT_RESPONSE_INPUT_NAME,
    theme: container.getAttribute('data-theme') || DEFAULT_THEME,
    lang: detectLanguage(container),
    assetBaseUrl: resolveAssetBaseURL(container),
  }

  const apiUrl = container.getAttribute('data-api-url')
  if (apiUrl) {
    params.apiUrl = apiUrl
  }

  return params
}

const registerMessageListener = () => {
  const win = getWindow()

  if (!win || messageListenerRegistered) {
    return
  }

  win.addEventListener('message', postMessageCallback)
  messageListenerRegistered = true
}

export const loadCaptcha = (forced = false) => {
  const win = getWindow()
  const doc = getDocument()

  if (!win || !doc) {
    return
  }

  if (!forced && 'swecaptcha' in win) {
    log(LOG_ACTIONS.warn, 'Captcha is already loaded.')
  }

  win.swecaptcha = true
  registerMessageListener()

  const containers = Array.from(doc.querySelectorAll(CAPTCHA_SELECTOR))

  for (const container of containers) {
    const params = parseParams(container)

    if (!validateParams(params)) {
      log(LOG_ACTIONS.error, 'Aborting captcha rendering due to invalid parameters.')
      return
    }

    renderCaptcha(container, params)
  }
}

export const forceLoadCaptcha = () => loadCaptcha(true)

const setupCaptcha = () => {
  const win = getWindow()
  const doc = getDocument()

  if (!win || !doc) {
    return
  }

  win.swetrixCaptchaForceLoad = forceLoadCaptcha

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', () => loadCaptcha(), { once: true })
    return
  }

  loadCaptcha()
}

setupCaptcha()
