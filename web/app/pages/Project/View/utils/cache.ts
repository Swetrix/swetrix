import { LS_PROJECTS_PROTECTED_KEY } from '~/lib/constants'
import { type Project } from '~/lib/models/Project'
import { getItemJSON, setItem } from '~/utils/localstorage'

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
}
