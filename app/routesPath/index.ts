const routes = Object.freeze({
  signin: '/login', // add
  signup: '/signup', // add
  reset_password: '/recovery', // add
  new_password_form: '/password-reset/:id', // add
  confirm_share: '/share/:id',
  confirm_subcription: '/projects/:id/subscribers/invite',
  main: '/',
  dashboard: '/dashboard',
  user_settings: '/settings',
  verify: '/verify-email/:id', // add
  change_email: '/change-email/:id', // add
  new_project: '/projects/new',
  new_captcha: '/captchas/new',
  project_settings: '/projects/settings/:id',
  captcha_settings: '/captchas/settings/:id',
  project: '/projects/:id',
  captcha: '/captchas/:id',
  features: '/features',
  billing: '/billing',
  privacy: '/privacy',
  cookiePolicy: '/cookie-policy', // add
  terms: '/terms', // add
  contact: '/contact', // add
  changelog: '/changelog', // add
  about: '/about', // add
  create_alert: '/projects/:pid/alerts/create',
  alert_settings: '/projects/:pid/alerts/settings/:id',
  press: '/press',
  transfer_confirm: '/project/transfer/confirm',
  transfer_reject: '/project/transfer/cancel',
  socialised: '/socialised', // add
  project_protected_password: '/projects/:id/password',
  open: '/open-startup', // add
})

export default routes
