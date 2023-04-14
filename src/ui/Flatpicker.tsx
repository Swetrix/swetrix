/* eslint-disable react/no-unused-class-component-methods, class-methods-use-this */
import React, { memo, createRef } from 'react'
import Flatpickr from 'react-flatpickr'
import _size from 'lodash/size'
import PropTypes from 'prop-types'

import { getItem } from 'utils/localstorage'
import { MAX_MONTHS_IN_PAST } from 'redux/constants'
import './Flatpicker.css'

if (getItem('colour-theme') === 'light') {
  // @ts-ignore
  import('flatpickr/dist/themes/light.css')
} else {
  // @ts-ignore
  import('flatpickr/dist/themes/dark.css')
}

interface FlatPickerProps {
  onChange?: (dates: Date[]) => void,
  value?: Date[],
  maxDateMonths?: number,
}

class FlatPicker extends React.Component<FlatPickerProps> {
  private calendar = createRef<Flatpickr>()

  constructor(props: FlatPickerProps) {
    super(props)
    this.setCustomDate = this.setCustomDate.bind(this)
  }

  private setCustomDate(dates: Date[]) {
    const { onChange } = this.props

    if (_size(dates) === 2) {
      onChange?.(dates)
    }
  }

  private openCalendar = () => {
    if (this.calendar.current) {
      this.calendar.current.flatpickr.open()
    }
  }

  private removeMonths(date: Date, months: number) {
    const d = date.getDate()
    date.setMonth(date.getMonth() - months)
    if (date.getDate() !== d) {
      date.setDate(0)
    }
    return date
  }

  public render() {
    const { value = [], maxDateMonths = MAX_MONTHS_IN_PAST } = this.props

    return (
      <div className='h-0 flatpicker-custom'>
        <Flatpickr
          id='calendar'
          data-testid='calendar'
          value={value}
          options={{
            mode: 'range',
            maxDate: 'today',
            minDate: this.removeMonths(new Date(), maxDateMonths),
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

// @ts-ignore
FlatPicker.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  maxDateMonths: PropTypes.number,
}

// @ts-ignore
FlatPicker.defaultProps = {
  onChange: () => { },
  value: [],
  maxDateMonths: MAX_MONTHS_IN_PAST,
}

export default memo(FlatPicker)
