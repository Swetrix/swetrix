import { cacheActions } from './cache'
import { miscActions } from './misc'
import { themeActions } from './theme'

const UIActions = {
  ...cacheActions,
  ...miscActions,
  ...themeActions,
}

export default UIActions
