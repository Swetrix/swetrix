/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { fireEvent, render } from '@testing-library/react'

import TimezonePicker from '../TimezonePicker'

describe('TimezonePricker', () => {
  const onChange = jest.fn()

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the component', () => {
    const { getByText } = render(
      <TimezonePicker value='Europe/London' onChange={onChange} />,
    )

    expect(getByText('(GMT+1:00) Edinburgh, London')).toBeInTheDocument()
  })

  it('calls onChange function when an option is selected', () => {
    const { getByText, getByRole } = render(
      <TimezonePicker value='Europe/London' onChange={onChange} />,
    )

    fireEvent.click(getByRole('button'))

    const option = getByText('(GMT-7:00) Arizona')
    fireEvent.click(option)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('America/Phoenix')
  })

  it('snapshots', () => {
    const { container } = render(
      <TimezonePicker value='Europe/London' onChange={onChange} />,
    )

    expect(container).toMatchSnapshot()
  })
})
