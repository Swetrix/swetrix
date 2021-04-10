import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Spinner from 'react-bootstrap/Spinner'

import ViewProject from './ViewProject'

export default () => {
  const location = useLocation()
  const { name, id } = location.state || {}
  const [project, setProject] = useState({})
  

  const onSubmit = () => {
    // TODO
  }

  const getProject = () => {
    // TODO
  }

  if (id && name) {
    return (
      <ViewProject name={name} id={id} />
    )
  }

  if (Object.keys(project).length > 0) {
    return (
      <ViewProject {...project} />
    )
  }

  return (
    <div className="container d-flex justify-content-center">
      <Spinner animation="border" role="status" variant="primary" className="spinner-lg">
        <span className="sr-only">Loading...</span>
      </Spinner>
    </div>
  )
}