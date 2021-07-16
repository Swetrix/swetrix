import { connect } from 'react-redux'
import { errorsActions } from 'redux/actions/errors'
import ViewProject from './ViewProject'

const mapStateToProps = (state) => ({
  projects: state.ui.projects.projects,
  isLoading: state.ui.projects.isLoading,
})

const mapDispatchToProps = (dispatch) => ({
  showError: (message) => {
    dispatch(errorsActions.genericError(message))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(ViewProject)
