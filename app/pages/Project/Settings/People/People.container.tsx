import { connect } from 'react-redux'
import UIActions from 'redux/reducers/ui'
import { StateType, AppDispatch } from 'redux/store'
import { IProject } from 'redux/models/IProject'

import People from './People'

const mapStateToProps = (state: StateType) => ({
  isPaidTierUsed: state.auth.isPaidTierUsed,
  user: state.auth.user,
})

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  setProjectShareData: (data: Partial<IProject>, projectId: string, shared = false) => {
    dispatch(
      UIActions.setProjectsShareData({
        data,
        id: projectId,
        shared,
      }),
    )
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(People)
