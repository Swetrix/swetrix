/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-unresolved */
import React from 'react'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom'
import i18n from 'i18next'
import Footer from '../Footer'

describe('Footer', () => {
  const history = createMemoryHistory()

  const minimalProps = {
    minimal: true,
    authenticated: false,
  }

  const fullProps = {
    minimal: false,
    authenticated: true,
  }

  beforeAll(() => {
    i18n.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: {
        en: {
          common: {
            'footer.contact': 'Contact Us',
            'footer.pp': 'Privacy Policy',
            'footer.tos': 'Terms of Service',
            'footer.about': 'About Us',
            'footer.status': 'Status',
            'footer.slogan': 'Your website, our analytics',
            'footer.description': 'Swetrix helps you monitor, analyze and optimize your website traffic in real time',
            'footer.madeIn': 'Made in',
            'footer.ukraine': 'Ukraine',
            'footer.hostedIn': 'Hosted in',
            'footer.eu': 'European Union',
            'footer.comparisons': 'Comparisons',
          },
        },
      },
    })
  })

  it('renders minimal footer', () => {
    const { getByLabelText, getByText } = render(
      // @ts-ignore
      <Router history={history}>
        <I18nextProvider i18n={i18n}>
          <Footer {...minimalProps} />
        </I18nextProvider>
      </Router>,
    )

    expect(getByLabelText('Footer')).toBeInTheDocument()

    expect(getByText('Contact Us')).toHaveAttribute('href', '/contact')
    expect(getByText('Privacy Policy')).toHaveAttribute('href', '/privacy')
    expect(getByText('Terms of Service')).toHaveAttribute('href', '/terms')
    expect(getByText('About Us')).toHaveAttribute('href', '/about')
  })

  it('renders full footer', () => {
    const { getByLabelText, getByText } = render(
      // @ts-ignore
      <Router history={history}>
        <I18nextProvider i18n={i18n}>
          <Footer {...fullProps} />
        </I18nextProvider>
      </Router>,
    )

    expect(getByLabelText('Footer')).toBeInTheDocument()

    expect(getByText('Contact Us')).toHaveAttribute('href', '/contact')
    expect(getByText('About Us')).toHaveAttribute('href', '/about')
    expect(getByText('Made in')).toBeInTheDocument()
    expect(getByText('Ukraine')).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Ukraine')
    expect(getByText('Hosted in')).toBeInTheDocument()
    expect(getByText('European Union')).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/European_Union')
  })
})
