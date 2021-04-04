import React from 'react'
import { useDispatch } from 'react-redux'

import { authActions } from 'actions/auth'
import { errorsActions } from 'actions/errors'
import { alertsActions } from 'actions/alerts'
import UserSettings from './UserSettings'

export default () => {
  const dispatch = useDispatch()

  const onDelete = () => {
    dispatch(
      authActions.deleteAccountAsync(
        (error) => dispatch(
          errorsActions.deleteAccountFailed(error.description)
        )
      )
    )
  }

  const onExport = () => {
    // TODO
  }

  const onSubmit = (data) => {
    delete data.repeat
		for (let key in data) {
			if (data[key] === '') {
				delete data[key]
			}
		}

		dispatch(
			authActions.updateUserProfileAsync(
        data,
				() => dispatch(
          alertsActions.accountUpdated('Your account settings have been updated!')
        )
			)
		);
  }

  const onEmailConfirm = () => {
    // TODO
  }

  return (
    <UserSettings
      onDelete={onDelete}
      onExport={onExport}
      onSubmit={onSubmit}
      onEmailConfirm={onEmailConfirm}
      />
  )
}