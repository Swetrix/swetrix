/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'

import TimezonePicker from '../TimezonePicker'

describe('TimezonePricker', () => {
  const onChange = jest.fn()

  afterEach(() => {
    jest.clearAllMocks()
  })

  const HocWithI18n = (props: any): JSX.Element => (
    <I18nextProvider i18n={i18n}>
      <TimezonePicker {...props} />
    </I18nextProvider>
  )

  // initialize i18n before each test
  beforeEach(() => {
    i18n.init({
      lng: 'en',
      resources: {
        en: {
          profileSettings: {
            timezoneDesc: 'Timezone description',
          },
        },
      },
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders the component', () => {
    const { getByText } = render(
      <HocWithI18n value='Europe/London' onChange={onChange} />,
    )

    expect(getByText('(GMT+1:00) Edinburgh, London')).toBeInTheDocument()
  })

  it('calls onChange function when an option is selected', () => {
    const { getByText, getByRole } = render(
      <HocWithI18n value='Europe/London' onChange={onChange} />,
    )

    fireEvent.click(getByRole('button'))

    const option = getByText('(GMT-7:00) Arizona')
    fireEvent.click(option)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('America/Phoenix')
  })

  it('snapshots', () => {
    const { container } = render(
      <HocWithI18n value='Europe/London' onChange={onChange} />,
    )

    expect(container).toMatchSnapshot()
  })
})
