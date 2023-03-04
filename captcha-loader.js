(() => {
  const CAPTCHA_SELECTOR = '.swecaptcha'
  const CAPTCHA_IFRAME_URL = './index.html'

  const renderCaptcha = (container) => {
    const captchaFrame = document.createElement('iframe')

    captchaFrame.src = CAPTCHA_IFRAME_URL
    captchaFrame.title = 'Swetrix Captcha'

    container.appendChild(captchaFrame)
  }

  const main = () => {
    const containers = document.querySelectorAll(CAPTCHA_SELECTOR)

    for (const container of containers) {
      renderCaptcha(container)
    }
  }

  const log = (status, text) => {
    console[status](`[Swetrix Captcha] ${text}`)
  }

  if ('swecaptcha' in window) {
    log('warn', 'Captcha is already loaded.')
  }

  document.addEventListener('DOMContentLoaded', main)
})
