import React from 'react'
import { useDispatch } from 'react-redux'

import { authActions } from 'actions/auth'
import { errorsActions } from 'actions/errors'
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

  const onSubmit = () => {
    // TODO
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