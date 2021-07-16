import React, { useState, useEffect } from 'react'
import Spinner from 'react-bootstrap/Spinner'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'

import { authActions } from 'redux/actions/auth'

const VerifyEmail = () => {
  const dispatch = useDispatch()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    const path = window.location.pathname.split('/')[1]

    dispatch(authActions.emailVerifyAsync(
      { path, id },
      () => setLoading(false),
      (error) => {
        setError(error.message)
        setLoading(false)
      }))
  }, [dispatch, id])

  return (
    <div className="container d-flex justify-content-center">
      {loading
        ? (
          <Spinner animation="border" role="status" variant="primary" className="spinner-lg">
            <span className="sr-only">Loading...</span>
          </Spinner>
        )
        : (
          <p>{ error ? error : 'Your email has been successfully verified!' }</p>
        )}
    </div>
  )
}

export default VerifyEmail