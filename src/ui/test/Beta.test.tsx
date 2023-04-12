/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'
import Beta from '../Beta'

describe('Beta component', () => {
  beforeEach(() => {
    i18n.init({
      lng: 'en',
      resources: {
        en: {
          beta: {
            title: 'Beta',
          },
        },
      },
    })
  })

  it('should render with a custom class name', () => {
    const { getByText } = render(
      <I18nextProvider i18n={i18n}>
        <Beta className='custom-class-name' />
      </I18nextProvider>,
    )
    expect(getByText('Beta')).toHaveClass('custom-class-name')
  })
})
