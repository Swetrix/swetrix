import React, { useState, useEffect } from 'react'
import Spinner from 'react-bootstrap/Spinner'
import Alert from 'react-bootstrap/Alert'

import Dashboard from './Dashboard'
import { getProjects } from 'api'
 
export default () => {
  const [projects, setProjects] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const fetchedProjects = await getProjects()
        setProjects(fetchedProjects.results)
      } catch (e) {
        setError(e)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  if (error && !loading) {
    return (
      <div className="container d-flex justify-content-center">
        <Alert variant="danger">
          {error}
        </Alert>
      </div>
    )
  }

  if (!loading) {
    return (
      <Dashboard projects={projects} />
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