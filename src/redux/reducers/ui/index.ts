import { alertsActions } from './alerts'
import { cacheActions } from './cache'

const UIActions = {
  ...alertsActions,
  ...cacheActions,
}

export default UIActions
