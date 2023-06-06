/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import AlertTemplate from '../Alert'
import '@testing-library/jest-dom'

describe('AlertTemplate', () => {
  const closeMock = jest.fn()

  afterEach(() => {
    closeMock.mockClear()
  })

  test('renders an info alert', () => {
    const { getByText, getByRole } = render(
      <AlertTemplate message='This is an info alert' options={{ type: 'info' }} close={closeMock} />,
    )

    expect(getByText('This is an info alert')).toBeInTheDocument()
    expect(getByRole('button')).toBeInTheDocument()

    fireEvent.click(getByRole('button'))
    expect(closeMock).toHaveBeenCalled()
  })

  test('renders a success alert', () => {
    const { getByText, getByRole } = render(
      <AlertTemplate message='This is a success alert' options={{ type: 'success' }} close={closeMock} />,
    )

    expect(getByText('This is a success alert')).toBeInTheDocument()
    expect(getByRole('button')).toBeInTheDocument()

    fireEvent.click(getByRole('button'))
    expect(closeMock).toHaveBeenCalled()
  })

  test('renders an error alert', () => {
    const { getByText, getByRole } = render(
      <AlertTemplate message='This is an error alert' options={{ type: 'error' }} close={closeMock} />,
    )

    expect(getByText('This is an error alert')).toBeInTheDocument()
    expect(getByRole('button')).toBeInTheDocument()

    fireEvent.click(getByRole('button'))
    expect(closeMock).toHaveBeenCalled()
  })
})
