import { alertsActions } from './alerts'
import { cacheActions } from './cache'
import { miscActions } from './misc'

const UIActions = {
  ...alertsActions,
  ...cacheActions,
  ...miscActions,
}

export default UIActions
