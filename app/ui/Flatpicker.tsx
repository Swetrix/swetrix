/* eslint-disable react/no-unused-class-component-methods, class-methods-use-this */
import React, { memo, createRef } from 'react'
import Flatpickr from 'react-flatpickr'
import _size from 'lodash/size'
import _split from 'lodash/split'
import PropTypes from 'prop-types'
import cx from 'clsx'

import { MAX_MONTHS_IN_PAST } from 'redux/constants'

interface FlatPickerProps {
  onChange?: (dates: Date[]) => void,
  value?: Date[],
  maxDateMonths?: number,
  options?: any,
  maxRange?: number,
  className?: string,
}

class FlatPicker extends React.Component<FlatPickerProps, {
  maxDate: string,
  minDate: Date | string,
}> {
  private calendar = createRef<Flatpickr>()

  constructor(props: FlatPickerProps) {
    super(props)
    this.setCustomDate = this.setCustomDate.bind(this)
    this.state = {
      maxDate: 'today',
      minDate: this.removeMonths(new Date(), props?.maxDateMonths || 24),
    }
  }

  private setCustomDate(dates: Date[]) {
    const { onChange, maxRange } = this.props

    if (maxRange && maxRange > 0 && _size(dates) === 1) {
      const maxDate = new Date(dates[0])
      const minDate = new Date(dates[0])
      maxDate.setDate(maxDate.getDate() + maxRange)
      minDate.setDate(minDate.getDate() - maxRange)

      this.setState({
        maxDate: maxDate > new Date() ? 'today' : _split(maxDate.toISOString(), 'T')[0],
        minDate: _split(minDate.toISOString(), 'T')[0],
      })
    }

    if (_size(dates) === 2) {
      onChange?.(dates)
    }
  }

  private openCalendar = () => {
    if (this.calendar.current) {
      this.setState({
        maxDate: 'today',
        // eslint-disable-next-line react/destructuring-assignment
        minDate: this.removeMonths(new Date(), this.props?.maxDateMonths || 24),
      })
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
    const {
      value = [], maxDateMonths = MAX_MONTHS_IN_PAST, options, className,
    } = this.props
    const { maxDate, minDate } = this.state

    if (options) {
      return (
        <div className={className}>
          <Flatpickr
            id='calendar'
            value={value}
            options={{
              mode: 'range',
              maxDate: 'today',
              minDate: this.removeMonths(new Date(), maxDateMonths),
              showMonths: 1,
              animate: true,
              altInput: true,
              position: 'auto',
              ...options,
            }}
            onChange={this.setCustomDate}
            placeholder='Select a date range...'
          />
        </div>
      )
    }

    return (
      <div className={cx('h-0 flatpicker-custom', className)}>
        <Flatpickr
          id='calendar'
          data-testid='calendar'
          value={value}
          options={{
            mode: 'range',
            maxDate,
            minDate,
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
  className: PropTypes.string,
}

// @ts-ignore
FlatPicker.defaultProps = {
  onChange: () => { },
  value: [],
  maxDateMonths: MAX_MONTHS_IN_PAST,
  options: null,
  maxRange: 0,
  className: '',
}

export default memo(FlatPicker)
