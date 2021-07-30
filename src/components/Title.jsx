import React from 'react'
import { Helmet } from 'react-helmet'
import { TITLE_SUFFIX } from 'redux/constants'

const Title = ({ title, children }) => (
  <>
    <Helmet>
      <title>{title} {TITLE_SUFFIX}</title>
    </Helmet>
    {children}
  </>
)

export default Title
