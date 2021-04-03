import React from 'react'
import { useDispatch } from 'react-redux'

import UserSettings from './UserSettings'

export default () => {
  const dispatch = useDispatch()

  const onDelete = () => {
    // TODO
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