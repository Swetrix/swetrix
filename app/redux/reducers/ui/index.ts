import { alertsActions } from './alerts'
import { cacheActions } from './cache'
import { miscActions } from './misc'
import { projectsActions } from './projects'
import { themeActions } from './theme'

const UIActions = {
  ...alertsActions,
  ...cacheActions,
  ...miscActions,
  ...projectsActions,
  ...themeActions,
}

export default UIActions
