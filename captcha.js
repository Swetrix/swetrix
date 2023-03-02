let activeAction = 'checkbox'

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

document.addEventListener('DOMContentLoaded', () => {
  const captchaComponent = document.querySelector('#swetrix-captcha')
  const branding = document.querySelector('#branding')

  branding.addEventListener('click', (e) => {
    e.stopPropagation()
  })

  captchaComponent.addEventListener('click', () => {
    if (activeAction === 'failure') {
      activateAction('checkbox')
      return
    }

    activateAction('loading')

    setTimeout(() => {
      // activateAction('completed')
      activateAction('failure')
    }, 2000)
  })
})
