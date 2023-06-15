const routes = Object.freeze({
  signin: '/login', // add
  signup: '/signup', // add
  reset_password: '/recovery', // add
  new_password_form: '/password-reset/:id', // add
  confirm_share: '/share/:id', // add
  confirm_subcription: '/projects/:id/subscribers/invite', // add
  main: '/', // add
  dashboard: '/dashboard', // add
  user_settings: '/user-settings', // add
  verify: '/verify-email/:id', // add
  change_email: '/change-email/:id', // add
  new_project: '/projects/new', // add
  new_captcha: '/captchas/new', // add
  project_settings: '/projects/settings/:id', // add
  captcha_settings: '/captchas/settings/:id', // add
  project: '/projects/:id', // add
  captcha: '/captchas/:id',
  features: '/features', // add
  billing: '/billing', // add
  privacy: '/privacy', // add
  cookiePolicy: '/cookie-policy', // add
  terms: '/terms', // add
  contact: '/contact', // add
  changelog: '/changelog', // add
  about: '/about', // add
  create_alert: '/projects/:pid/alerts/create', // add
  alert_settings: '/projects/:pid/alerts/settings/:id', // add
  press: '/press', // add
  transfer_confirm: '/project/transfer/confirm', // add
  transfer_reject: '/project/transfer/cancel', // add
  socialised: '/socialised', // add
  project_protected_password: '/projects/:id/password', // add
  open: '/open-startup', // add
})

export default routes
