import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

import routes from 'routes'

const ViewProject = ({ id, name }) => {

  return (
    <div className="container">
      <div className="d-flex justify-content-between">
        <h2>{name}</h2>
        <Link
          to={{
            pathname: routes.new_project,
            state: { name, id },
          }}
          className="btn btn-outline-primary h-100">
          Settings
        </Link>
      </div>
    </div>
  )
}

ViewProject.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
}

export default ViewProject