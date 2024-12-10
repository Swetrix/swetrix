import { cacheActions } from './cache'
import { miscActions } from './misc'
import { projectsActions } from './projects'
import { themeActions } from './theme'
import { monitorActions } from './monitors'

const UIActions = {
  ...cacheActions,
  ...miscActions,
  ...projectsActions,
  ...themeActions,
  ...monitorActions,
}

export default UIActions
