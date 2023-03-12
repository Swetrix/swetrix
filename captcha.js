const API_URL = 'http://localhost:5005/v1/captcha'
const MESSAGE_IDENTIFIER = 'swetrix-captcha'
const DEFAULT_THEME = 'light'
let TOKEN = ''
let HASH = ''

const ENDPOINTS = {
  VERIFY: '/verify',
  GENERATE: '/generate',
  VERIFY_MANUAL: '/verify-manual',
}

const IFRAME_MESSAGE_TYPES = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  TOKEN_EXPIRED: 'tokenExpired',
}

let activeAction = 'checkbox'

const postMessage = (event, data = {}) => {
  window.parent.postMessage({
    event,
    type: MESSAGE_IDENTIFIER,
    cid: window.__SWETRIX_CAPTCHA_ID,
    ...data,
  }, '*')
}

/**
 * Sets the provided action visible and the rest hidden
 * @param {*} action checkbox | failure | completed | loading
 */
const activateAction = (action) => {
  activeAction = action

  const statusDefault = document.querySelector('#status-default')
  const statusFailure = document.querySelector('#status-failure')

  const actions = {
    checkbox: document.querySelector('#checkbox'),
    failure: document.querySelector('#failure'),
    completed: document.querySelector('#completed'),
    loading: document.querySelector('#loading'),
  }

  // Apply hidden class to all actions
  actions.checkbox.classList.add('hidden')
  actions.failure.classList.add('hidden')
  actions.completed.classList.add('hidden')
  actions.loading.classList.add('hidden')

  // Change the status text
  if (action === 'failure') {
    statusDefault.classList.add('hidden')
    statusFailure.classList.remove('hidden')
  } else {
    statusDefault.classList.remove('hidden')
    statusFailure.classList.add('hidden')
  }

  // Remove hidden class from the provided action
  actions[action].classList.remove('hidden')
}

const enableManualChallenge = (svg) => {
  const manualChallenge = document.querySelector('#manual-challenge')
  const svgCaptcha = document.querySelector('#svg-captcha')

  if (!svg) {
    const error = document.createElement('p')
    error.innerText = 'Error loading captcha'
    error.style.color = '#d6292a'
    svgCaptcha.appendChild(error)
  } else {
    svgCaptcha.innerHTML = svg
  }
  
  manualChallenge.classList.remove('hidden')
}

const disableManualChallenge = () => {
  const manualChallenge = document.querySelector('#manual-challenge')
  const svgCaptcha = document.querySelector('#svg-captcha')

  svgCaptcha.innerHTML = ''
  manualChallenge.classList.add('hidden')
}

const generateCaptcha = async () => {
  try {
    const response = await fetch(`${API_URL}${ENDPOINTS.GENERATE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme: window.__SWETRIX_CAPTCHA_THEME || DEFAULT_THEME,
        pid: window.__SWETRIX_PROJECT_ID,
      }),
    })
  
    if (!response.ok) {
      throw ''
    }
  
    const data = await response.json()
    return data
  } catch (e) {
    postMessage(IFRAME_MESSAGE_TYPES.FAILURE)
    activateAction('failure')
    return {}
  }
}

const verify = async () => {
  try {
    const response = await fetch(`${API_URL}${ENDPOINTS.VERIFY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pid: window.__SWETRIX_PROJECT_ID,
      }),
    })

    if (!response.ok) {
      return {}
    }

    const data = await response.json()
    return data
  } catch (e) {
    postMessage(IFRAME_MESSAGE_TYPES.FAILURE)
    activateAction('failure')
    return {}
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const captchaComponent = document.querySelector('#swetrix-captcha')
  const branding = document.querySelector('#branding')
  const svgCaptchaInput = document.querySelector('#svg-captcha-input')
  const manualSubmitBtn = document.querySelector('#manual-submit-btn')

  branding.addEventListener('click', (e) => {
    e.stopPropagation()
  })

  manualSubmitBtn.addEventListener('click', async (e) => {
    e.stopPropagation()

    const code = svgCaptchaInput.value

    if (!code) {
      return
    }

    let response

    try {
      response = await fetch(`${API_URL}${ENDPOINTS.VERIFY_MANUAL}`, {
        method: 'POST',
        body: JSON.stringify({
          hash: HASH,
          code,
          pid: window.__SWETRIX_PROJECT_ID,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (e) {
      disableManualChallenge()
      postMessage(IFRAME_MESSAGE_TYPES.FAILURE)
      activateAction('failure')
      svgCaptchaInput.value = ''
      return
    }

    if (!response.ok) {
      disableManualChallenge()
      postMessage(IFRAME_MESSAGE_TYPES.FAILURE)
      activateAction('failure')
      svgCaptchaInput.value = ''
      return
    }

    const { success, token } = await response.json()

    if (!success) {
      disableManualChallenge()
      postMessage(IFRAME_MESSAGE_TYPES.FAILURE)
      activateAction('failure')
      svgCaptchaInput.value = ''
      return
    }

    svgCaptchaInput.value = ''

    postMessage(IFRAME_MESSAGE_TYPES.SUCCESS, { token })
    activateAction('completed')
    disableManualChallenge()
  })

  captchaComponent.addEventListener('click', async () => {
    if (activeAction === 'loading' || activeAction === 'completed') {
      return
    }

    if (activeAction === 'failure') {
      activateAction('checkbox')
      return
    }

    activateAction('loading')

    try {
      const { token } = await verify()

      if (!token) {
        throw ''
      }

      TOKEN = token
      postMessage(IFRAME_MESSAGE_TYPES.SUCCESS, { token })
      activateAction('completed')
      return
    } catch (e) {
      const { data, hash } = await generateCaptcha()

      HASH = hash
      enableManualChallenge(data)
      return
    }
  })
})
