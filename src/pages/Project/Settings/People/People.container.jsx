import { connect } from 'react-redux'
import UIActions from 'redux/actions/ui'
import { errorsActions } from 'redux/actions/errors'

import People from './People'

const mapDispatchToProps = (dispatch) => ({
  updateProjectFailed: (message) => {
    dispatch(errorsActions.updateProjectFailed(message))
  },
  setProjectShareData: (projectId, share) => {
    dispatch(UIActions.setProjectsShareData(projectId, share))
  },
})

export default connect(null, mapDispatchToProps)(People)
