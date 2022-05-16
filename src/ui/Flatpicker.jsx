import React from "react"
import Flatpickr from "react-flatpickr"
import './Flatpicker.css'
import { getItem } from "utils/localstorage"
if (getItem('colour-theme') === 'light') {
  import("flatpickr/dist/themes/light.css")
} else {
  import("flatpickr/dist/themes/dark.css")
}

class FlatPicker extends React.Component {
  constructor(props) {
    super(props)
    this.setCustomDate = this.setCustomDate.bind(this)
    this.calendar = React.createRef(null)
  }

  setCustomDate(dates) {
    if (dates.length === 2) {
      this.props.onChange(dates)
      this.close()
    }
  }

  close() {
    this.setState({ open: false })
  }

  openCalendar = () => {
    this.calendar && this.calendar.current.flatpickr.open()
  }

  removeMonths(date, months) {
    let d = date.getDate()
    date.setMonth(date.getMonth() - months)
    if (date.getDate() !== d) {
      date.setDate(0)
    }
    return date
  }

  render() {
    return (
      <div className="h-0">
          <Flatpickr
            id="calendar"
            value={this.props.value}
            options={{
              mode: 'range',
              maxDate: 'today',
              minDate: this.removeMonths(new Date(), 24),
              showMonths: 1,
              static: true,
              animate: true,
              altInput: true,
              position: "auto right",
              altInputClass: 'hidden'
            }}
            ref={this.calendar}
            className="invisible"
            onChange={this.setCustomDate}
          />
      </div>
    )
  }
}

export default FlatPicker