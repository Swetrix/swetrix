import React from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
// eslint-disable-next-line import/no-extraneous-dependencies
import { render, screen, waitFor } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'

import App from './App'

const mockStore = configureStore({
  reducer: {
    auth: {
      loading: false,
      authenticated: false,
      user: null,
    },
    ui: {
      theme: {
        theme: 'light',
      },
    },
    errors: {
      error: null,
    },
    alerts: {
      message: '',
      type: '',
    },
  },
} as any)

describe('App component', () => {
  it('renders the main page', async () => {
    render(
      <Provider store={mockStore}>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </Provider>,
    )

    // eslint-disable-next-line testing-library/prefer-find-by
    await waitFor(() => expect(screen.getByTestId('main-page')).toBeInTheDocument())
  })

  it('renders the sign up page', async () => {
    render(
      <Provider store={mockStore}>
        <MemoryRouter initialEntries={['/signup']}>
          <App />
        </MemoryRouter>
      </Provider>,
    )

    // eslint-disable-next-line testing-library/prefer-find-by
    await waitFor(() => expect(screen.getByTestId('signup-page')).toBeInTheDocument())
  })

  // Add more test cases for other routes
})
