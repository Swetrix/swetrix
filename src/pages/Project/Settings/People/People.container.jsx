import { connect } from 'react-redux'
import UIActions from 'redux/actions/ui'
import { errorsActions } from 'redux/actions/errors'

import People from './People'

const mapDispatchToProps = (dispatch) => ({
  updateProjectFailed: (message) => {
    dispatch(errorsActions.updateProjectFailed(message))
  },
  setProjectShare: (projectId, share) => {
    dispatch(UIActions.setProjectsShare(projectId, share))
  },
})

export default connect(null, mapDispatchToProps)(People)
