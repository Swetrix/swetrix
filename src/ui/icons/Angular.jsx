import React from 'react'
import PropTypes from 'prop-types'

const Angular = ({ className }) => (
  <svg
    className={className}
    x='0px'
    y='0px'
    viewBox='0 0 250 250'
    xmlSpace='preserve'
  >
    <title>
      Angular
    </title>
    <g>
      <polygon className='fill-[#DD0031]' points='125,30 125,30 125,30 31.9,63.2 46.1,186.3 125,230 125,230 125,230 203.9,186.3 218.1,63.2  ' />
      <polygon className='fill-[#C3002F]' points='125,30 125,52.2 125,52.1 125,153.4 125,153.4 125,230 125,230 203.9,186.3 218.1,63.2 125,30  ' />
      <path className='fill-[#FFFFFF]' d='M125,52.1L66.8,182.6h0h21.7h0l11.7-29.2h49.4l11.7,29.2h0h21.7h0L125,52.1L125,52.1L125,52.1L125,52.1   L125,52.1z M142,135.4H108l17-40.9L142,135.4z' />
    </g>
  </svg>
)

Angular.propTypes = {
  className: PropTypes.string,
}

Angular.defaultProps = {
  className: '',
}

export default Angular
