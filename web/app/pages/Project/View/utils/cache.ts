import { LS_PROJECTS_PROTECTED_KEY, isBrowser } from '~/lib/constants'
import { type Project } from '~/lib/models/Project'
import { getItemJSON, setItem } from '~/utils/localstorage'

export const PROJECT_PASSWORD_UPDATED_EVENT = 'swx-project-password-updated'

const getAllProjectPasswords = () =>
  getItemJSON(LS_PROJECTS_PROTECTED_KEY) || {}

// Reads the password the same way useProjectPassword does (URL param first,
// then localStorage). Used to attach x-password headers to proxy requests, as
// cookies are unreliable when the dashboard is embedded in a cross-site iframe.
export const getProjectPassword = (id: Project['id']): string | null => {
  if (!isBrowser) {
    return null
  }

  const fromQuery = new URLSearchParams(window.location.search).get('password')

  return fromQuery || getAllProjectPasswords()[id] || null
}

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
