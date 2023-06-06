import React from 'react'
import { useSelector } from 'react-redux'
import { Redirect, useParams } from 'react-router-dom'

import _find from 'lodash/find'
import _replace from 'lodash/replace'
import { StateType } from 'redux/store'
import routes from 'routes'

type PropsType = {
  [key: string]: any
}

export const withProjectProtected = <P extends PropsType>(WrappedComponent: any) => {
  const WithProjectProtected = (props: P) => {
    const passwords = useSelector((state: StateType) => state.ui.projects.password)
    const projects = useSelector((state: StateType) => state.ui.projects.projects)

    const { id }: {
      id: string
    } = useParams()

    const project = _find(projects, { id })

    if (project?.isOwner) {
      return <WrappedComponent {...props} />
    }

    if (project?.isPasswordProtected && !passwords[id]) {
      return <Redirect to={_replace(routes.project_protected_password, ':id', id)} />
    }

    return <WrappedComponent {...props} />
  }

  return WithProjectProtected
}
