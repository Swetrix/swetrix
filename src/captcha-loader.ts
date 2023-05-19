// @ts-ignore
const isDevelopment = window.__SWETRIX_CAPTCHA_DEV || false

const CAPTCHA_SELECTOR = '.swecaptcha'
const LIGHT_CAPTCHA_IFRAME_URL = isDevelopment ? 'https://cap.swetrix.com/pages/light' : './light.html'
const DARK_CAPTCHA_IFRAME_URL = isDevelopment ? 'https://cap.swetrix.com/pages/dark' : './dark.html'
const DEFAULT_RESPONSE_INPUT_NAME = 'swetrix-captcha-response'
const MESSAGE_IDENTIFIER = 'swetrix-captcha'
const ID_PREFIX = 'swetrix-captcha-'
const THEMES = ['light', 'dark']
const PID_REGEX = /^(?!.*--)[a-zA-Z0-9-]{12}$/

enum LOG_ACTIONS {
  log = 'log',
  error = 'error',
  warn = 'warn',
  info = 'info',
}

const DUMMY_PIDS = [
  'AP00000000000', 'MP00000000000', 'FAIL000000000',
]

const isValidPID = (pid: string) => DUMMY_PIDS.includes(pid) || PID_REGEX.test(pid)

const FRAME_HEIGHT_MAPPING = {
  default: '66px',
  manual: '200px',
}

const getFrameID = (cid: string) => `${cid}-frame`

const ids: string[] = []

const log = (status: LOG_ACTIONS, text: string) => {
  console[status](`[Swetrix Captcha] ${text}`)
}

const appendParamsToURL = (url: string, params: any) => {
  const queryString = Object.keys(params).map((key) => {
    return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
  }).join('&')

  return `${url}?${queryString}`
}

const renderCaptcha = (container: Element, params: any) => {
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

  const {
    type, cid, event,
  } = data

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
    
    case 'manualStarted': {
      const frame = document.getElementById(getFrameID(cid))

      if (!frame) {
        log(LOG_ACTIONS.error, '[PM -> manualStarted] Frame does not exist.')
        return
      }

      frame.style.height = FRAME_HEIGHT_MAPPING.manual

      break
    }

    case 'manualFinished': {
      const frame = document.getElementById(getFrameID(cid))

      if (!frame) {
        log(LOG_ACTIONS.error, '[PM -> manualFinished] Frame does not exist.')
        return
      }

      frame.style.height = FRAME_HEIGHT_MAPPING.default

      break
    }
  }
}

const generateCaptchaFrame = (params: any) => {
  const { theme } = params
  const captchaFrame = document.createElement('iframe')

  captchaFrame.id = getFrameID(params.cid)
  captchaFrame.src = theme === 'dark'
    ? appendParamsToURL(DARK_CAPTCHA_IFRAME_URL, params)
    : appendParamsToURL(LIGHT_CAPTCHA_IFRAME_URL, params)
  captchaFrame.style.height = FRAME_HEIGHT_MAPPING.default
  captchaFrame.title = 'Swetrix Captcha'
  captchaFrame.style.border = 'none'
  captchaFrame.style.width = '302px'
  captchaFrame.style.overflow = 'visible'

  return captchaFrame
}

const generateHiddenInput = (params: any) => {
  const { cid } = params
  const input = document.createElement('input')

  input.type = 'hidden'
  input.name = params.respName
  input.value = ''
  input.id = cid

  return input
}

const validateParams = (params: any) => {
  const { theme, pid } = params

  if (theme && !THEMES.includes(theme)) {
    log(LOG_ACTIONS.error, `Invalid data-theme parameter: ${theme}`)
    return false
  }

  if (!pid || !isValidPID(pid)) {
    log(LOG_ACTIONS.error, `Invalid data-project-id parameter: ${pid}`)
    return false
  }

  return true
}

const parseParams = (container: Element): object => ({
  pid: container.getAttribute('data-project-id'),
  respName: container.getAttribute('data-response-input-name') || DEFAULT_RESPONSE_INPUT_NAME,
  theme: container.getAttribute('data-theme'),
})

const main = () => {
  if ('swecaptcha' in window) {
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

document.addEventListener('DOMContentLoaded', main)
