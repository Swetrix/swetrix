import { connect } from 'react-redux'
import Dashboard from './Dashboard'

const mapStateToProps = (state) => ({
  projects: state.ui.projects.projects,
  isLoading: state.ui.projects.isLoading,
  error: state.ui.projects.error,
})

export default connect(mapStateToProps)(Dashboard)
