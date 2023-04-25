import React, { memo } from 'react'
import PropTypes from 'prop-types'
import cx from 'clsx'

interface ICode {
  text: string | number | React.ReactNode,
  className?: string,
  language: string,
}

const Code = ({ text, className, language }: ICode) => (
  <pre className={cx('w-full rounded-md bg-gray-800 dark:bg-gray-750', className)}>
    <code className={`whitespace-pre-wrap language-${language}`}>{text}</code>
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
