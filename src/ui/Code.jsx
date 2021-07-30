import React, { memo } from 'react'
import PropTypes from 'prop-types'
import cx from 'classnames'

const Code = ({ text, className, language }) => (
  <pre className={cx('whitespace-pre-line w-full rounded-md bg-gray-800', className)}>
    <code className={`language-${language}`}>{text}</code>
  </pre>
)

Code.propTypes = {
  text: PropTypes.oneOfType([
    PropTypes.string, PropTypes.number, PropTypes.node,
  ]).isRequired,
  language: PropTypes.string.isRequired,
  className: PropTypes.string,
}

Code.defaultProps = {
  className: '',
}

export default memo(Code)
