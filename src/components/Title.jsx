import React from 'react'
import { Helmet } from 'react-helmet'
import _isEmpty from 'lodash/isEmpty'
import PropTypes from 'prop-types'

import { TITLE_SUFFIX } from 'redux/constants'

const Title = ({ title, children }) => {
  if (_isEmpty(title)) {
    return (
      <>
        <Helmet>
          <title>Swetrix Analytics</title>
        </Helmet>
        {children}
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>{title} {TITLE_SUFFIX}</title>
      </Helmet>
      {children}
    </>
  )
}

Title.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
}

Title.defaultProps = {
  title: '',
}

export default Title
