/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'
import { IUser } from 'redux/models/IUser'
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom'
import configureMockStore from 'redux-mock-store'

import { Provider } from 'react-redux'
import Header from '../Header'

describe('Header', () => {
  const history = createMemoryHistory()
  const authenticated = true
  const mockStore = configureMockStore()
  const store = mockStore({})
  const theme = 'dark'
  const user: IUser = {
    id: 'testid',
    email: 'asad@gmail.com',
    nickname: 'testuser',
    roles: ['admin'],
    isActive: true,
    planCode: 'testplan',
    trialEndDate: '2021-01-01T00:00:00.000Z',
    reportFrequency: 'daily',
    emailRequests: 0,
    evWarningSentOn: null,
    subID: null,
    subUpdateURL: null,
    subCancelURL: null,
    created: '',
    updated: '',
    exportedAt: '',
    timezone: '',
    theme: null,
    isTwoFactorAuthenticationEnabled: false,
    trialReminderSent: false,
    billingFrequency: null,
    nextBillDate: null,
    cancellationEffectiveDate: null,
    apiKey: null,
    telegramChatId: null,
    isTelegramChatIdConfirmed: false,
    timeFormat: '',
    sharedProjects: [],
    registeredWithGoogle: false,
    googleId: null,
    githubId: null,
    registeredWithGithub: false,
    tierCurrency: 'USD',
    maxEventsCount: 5000000,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  beforeAll(() => {
    i18n.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: {
        en: {
          'footer.contact': 'Contact Us',
          'footer.blog': 'Blog',
          'common.logout': 'Logout',
          'common.login': 'Login',
          'common.dashboard': 'Dashboard',
        },
      },
    })
  })

  test('renders authed header if authenticated', () => {
    render(
      // @ts-ignore
      <Router history={history}>
        <Provider store={store}>
          <I18nextProvider i18n={i18n}>
            <Header authenticated={authenticated} theme={theme} user={user} />
          </I18nextProvider>
        </Provider>
      </Router>,
    )

    expect(screen.getAllByText(/common.dashboard/i)).toHaveLength(2)
  })

  test('renders not-authed header if not authenticated', () => {
    render(
      // @ts-ignore
      <Router history={history}>
        <Provider store={store}>
          <I18nextProvider i18n={i18n}>
            <Header authenticated={false} theme={theme} user={user} />
          </I18nextProvider>
        </Provider>
      </Router>,
    )

    expect(screen.getByText(/auth.common.signin/i)).toBeInTheDocument()
  })
})
