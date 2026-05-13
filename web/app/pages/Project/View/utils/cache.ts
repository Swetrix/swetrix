import { LS_PROJECTS_PROTECTED_KEY, isBrowser } from '~/lib/constants'
import { type Project } from '~/lib/models/Project'
import { getItemJSON, setItem } from '~/utils/localstorage'

export const PROJECT_PASSWORD_UPDATED_EVENT = 'swx-project-password-updated'

const getAllProjectPasswords = () =>
  getItemJSON(LS_PROJECTS_PROTECTED_KEY) || {}

export const setProjectPassword = (id: Project['id'], password: string) => {
  setItem(
    LS_PROJECTS_PROTECTED_KEY,
    JSON.stringify({
      ...getAllProjectPasswords(),
      [id]: password,
    }),
  )

  if (isBrowser) {
    window.dispatchEvent(
      new CustomEvent(PROJECT_PASSWORD_UPDATED_EVENT, {
        detail: { id, password },
      }),
    )
  }
}
