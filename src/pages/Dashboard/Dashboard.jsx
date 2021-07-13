import React from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'

import routes from 'routes'

const NoProjects = () => (
  <div className="mt-5">
    <h3 className="text-center">
      You have not yet created any projects
    </h3>
    <p className="text-center">
      Create a new project here to start using our service
    </p>
    <p className="text-center">
      <Link to={routes.new_project} className="btn btn-primary h-100 mt-3">
        Create a project
      </Link>
    </p>
  </div>
)

const Dashboard = ({ projects }) => {
  // const projects = [{
  //   id: 'nfvioqevisvn',
  //   name: 'Project #1',
  // }, {
  //   id: 'qwifjptirwnd',
  //   name: 'Project #2',
  // }, {
  //   id: 'zxvnpearinve',
  //   name: 'Facebook',
  // }]

  return (
    <div className="container">
      <div className="d-flex justify-content-between">
        <h2>Dashboard</h2>
        <Link to={routes.new_project} className="btn btn-outline-primary h-100">
          New project
        </Link>
      </div>

      {
        projects.length > 0
          ? projects.map(({ name, id }) => (
            <div key={id} className="card mt-3">
              <Link
                to={{
                  pathname: routes.project.replace(':id', id),
                  state: { name, id },
                }}
                className="text-decoration-none text-reset">
                <div className="card-body list-group-item-action text-reset">
                  {name}
                </div>
              </Link>
            </div>
          ))
          : <NoProjects />
      }
    </div>
  )
}

Dashboard.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.object),
}

Dashboard.defaultProps = {
  projects: [],
}

export default Dashboard