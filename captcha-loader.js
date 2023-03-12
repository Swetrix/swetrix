(() => {
  const CAPTCHA_SELECTOR = '.swecaptcha'
  const LIGHT_CAPTCHA_IFRAME_URL = './light.html'
  const DARK_CAPTCHA_IFRAME_URL = './dark.html'

  const THEMES = ['light', 'dark']

  const log = (status, text) => {
    console[status](`[Swetrix Captcha] ${text}`)
  }

  const appendParamsToURL = (url, params) => {
    const queryString = Object.keys(params).map((key) => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    }).join('&')
  
    return `${url}?${queryString}`
  }

  const renderCaptcha = (container, params) => {
    const { theme } = params
    const captchaFrame = document.createElement('iframe')

    captchaFrame.src = theme === 'dark' ?
      appendParamsToURL(DARK_CAPTCHA_IFRAME_URL, params) :
      appendParamsToURL(LIGHT_CAPTCHA_IFRAME_URL, params)
    captchaFrame.title = 'Swetrix Captcha'
    captchaFrame.style.border = 'none'
    captchaFrame.style.width = '302px'
    captchaFrame.style.height = 'auto'
    captchaFrame.style.overflow = 'visible'

    container.appendChild(captchaFrame)
  }

  const validateParams = (params) => {
    const { theme } = params

    if (theme && !THEMES.includes(theme)) {
      log('error', `Invalid data-theme parameter: ${theme}`)
      return false
    }

    // TODO: Validate pid via regex

    return true
  }

  const parseParams = (container) => ({
    pid: container.getAttribute('data-project-id'),
    theme: container.getAttribute('data-theme'),
  })

  const main = () => {
    // TODO: Add some callbacks here
    window.swecaptcha = true

    const containers = document.querySelectorAll(CAPTCHA_SELECTOR)

    for (const container of containers) {
      const params = parseParams(container)

      if (!validateParams(params)) {
        log('error', 'Aborting captcha rendering due to invalid parameters.')
        return
      }

      renderCaptcha(container, params)
    }
  }

  if ('swecaptcha' in window) {
    log('warn', 'Captcha is already loaded.')
  }

  document.addEventListener('DOMContentLoaded', main)
})()
