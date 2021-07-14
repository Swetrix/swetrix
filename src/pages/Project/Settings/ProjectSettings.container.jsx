import { connect } from 'react-redux'
import { alertsActions } from 'actions/alerts'
import { errorsActions } from 'actions/errors'

import ProjectSettings from './ProjectSettings'

// const mapStateToProps = (state) => ({ })

const mapDispatchToProps = (dispatch) => ({
  updateProjectFailed: (message) => {
    dispatch(errorsActions.updateProjectFailed(message))
  },
  createNewProjectFailed: (message) => {
    dispatch(errorsActions.createNewProjectFailed(message))
  },
  newProject: (message) => {
    dispatch(alertsActions.newProject(message))
  },
  projectDeleted: () => {
    dispatch(alertsActions.projectDeleted('The project has been deleted'))
  },
  deleteProjectFailed: (message) => {
    dispatch(errorsActions.deleteProjectFailed(message))
  },
})

export default connect(null, mapDispatchToProps)(ProjectSettings)
