/* eslint-disable react/no-unused-class-component-methods, class-methods-use-this */
import React, { memo } from 'react'
import Flatpickr from 'react-flatpickr'
import _size from 'lodash/size'
import PropTypes from 'prop-types'

import { getItem } from 'utils/localstorage'
import './Flatpicker.css'

if (getItem('colour-theme') === 'light') {
  import('flatpickr/dist/themes/light.css')
} else {
  import('flatpickr/dist/themes/dark.css')
}

class FlatPicker extends React.Component {
  constructor(props) {
    super(props)
    this.setCustomDate = this.setCustomDate.bind(this)
    this.calendar = React.createRef(null)
  }

  setCustomDate(dates) {
    const { onChange } = this.props

    if (_size(dates) === 2) {
      onChange(dates)
    }
  }

  openCalendar = () => {
    if (this.calendar) {
      this.calendar.current.flatpickr.open()
    }
  }

  removeMonths(date, months) {
    const d = date.getDate()
    date.setMonth(date.getMonth() - months)
    if (date.getDate() !== d) {
      date.setDate(0)
    }
    return date
  }

  render() {
    const { value } = this.props

    return (
      <div className='h-0 flatpicker-custom'>
        <Flatpickr
          id='calendar'
          value={value}
          options={{
            mode: 'range',
            maxDate: 'today',
            minDate: this.removeMonths(new Date(), 24),
            showMonths: 1,
            static: true,
            animate: true,
            altInput: true,
            position: 'auto right',
            altInputClass: 'hidden',
          }}
          ref={this.calendar}
          className='invisible'
          onChange={this.setCustomDate}
        />
      </div>
    )
  }
}

FlatPicker.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
}

FlatPicker.defaultProps = {
  onChange: () => { },
  value: [],
}

export default memo(FlatPicker)
