import React, { useState } from 'react'
import PropTypes from 'prop-types'

import ProjectSettings from 'pages/Project/Create'
import { Locale } from './Panels' 

const ViewProject = (props) => {
  const { name } = props
  const [settings, setSettings] = useState(false)

  if (settings) {
    return (
      <ProjectSettings
        onCancel={() => setSettings(false)}
        project={props}
        />
    )
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between">
        <h2>{name}</h2>
        <button
          onClick={() => setSettings(true)}
          className="btn btn-outline-primary h-100">
          Settings
        </button>
      </div>
      <div className="d-flex flex-wrap">
        <Locale />
        <Locale />
        <Locale />
        <Locale />
        <Locale />
        <Locale />
        <Locale />
      </div>
    </div>
  )
}

ViewProject.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
}

export default ViewProject