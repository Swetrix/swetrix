import { connect } from 'react-redux'
import { errorsActions } from 'redux/actions/errors'
import Dashboard from './Dashboard'

const mapStateToProps = (state) => ({
  projects: state.ui.projects.projects,
  user: state.auth.user,
  isLoading: state.ui.projects.isLoading,
  error: state.ui.projects.error,
})

const mapDispatchToProps = (dispatch) => ({
  deleteProjectFailed: (message) => {
    dispatch(errorsActions.deleteProjectFailed(message))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard)
