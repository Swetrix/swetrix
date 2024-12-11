import { cacheActions } from './cache'
import { miscActions } from './misc'
import { projectsActions } from './projects'
import { themeActions } from './theme'

const UIActions = {
  ...cacheActions,
  ...miscActions,
  ...projectsActions,
  ...themeActions,
}

export default UIActions
