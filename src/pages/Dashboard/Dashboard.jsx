import React from 'react'
import { Link } from 'react-router-dom'

import routes from 'routes'

export default () => {
  const projects = [{
    id: 'nfvioqevisvn',
    name: 'Project #1',
  }, {
    id: 'qwifjptirwnd',
    name: 'Project #2',
  }, {
    id: 'zxvnpearinve',
    name: 'Facebook'
  }]

  return (
    <div className="container">
      <div className="d-flex justify-content-between">
        <h2>Dashboard</h2>
        <button className="btn btn-outline-primary">
          Create project
        </button>
      </div>
      {projects.map(({ name, id }) => (
        <div key={id} className="card mt-3">
          <Link to={routes.project.replace(':id', id)} className="text-decoration-none text-reset">
            <div class="card-body list-group-item-action text-reset">
              {name}
            </div>
          </Link>
        </div>
      ))}
    </div>
  )
}