const routes = Object.freeze({
  signin: '/login',
  signup: '/signup',
  reset_password: '/recovery',
  new_password_form: '/password-reset/:id',
  confirm_share: '/share/:id',
  main: '/',
  dashboard: '/dashboard',
  user_settings: '/settings',
  verify: '/verify/:id',
  change_email: '/change-email/:id',
  new_project: '/projects/new',
  project_settings: '/projects/settings/:id',
  project: '/projects/:id',
  docs: '/docs',
  features: '/features',
  billing: '/billing',
  privacy: '/privacy',
  terms: '/terms',
  contact: '/contact',
  about: '/about',
})

export default routes
