import React from 'react'
import { useLocation } from 'react-router-dom'

import CreateProject from './CreateProject'

export default () => {
  const location = useLocation()
  const { name, id } = location.state || {}

  const onSubmit = () => {
    // TODO
  }

  return (
    <CreateProject
      onSubmit={onSubmit}
      name={name}
      id={id}
      />
  )
}