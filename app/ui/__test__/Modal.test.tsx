/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'
import Modal from '../Modal'

describe('Modal component', () => {
  const defaultProps: {
    type: 'error' | 'success' | 'info' | 'warning' | 'confirmed',
    title: string,
    message: string,
    isOpened: boolean,
    onClose: () => void,
  } = {
    type: 'success',
    title: 'Success',
    message: 'Action completed successfully',
    isOpened: true,
    onClose: jest.fn(),
  }

  // use HOC to wrap component with I18nextProvider
  const HocWithI18n = (props: any): JSX.Element => (
    <I18nextProvider i18n={i18n}>
      <Modal {...props} />
    </I18nextProvider>
  )

  // initialize i18n before each test
  beforeEach(() => {
    i18n.init({
      lng: 'en',
      resources: {
        en: {
          beta: {
            title: 'beta.title',
          },
        },
      },
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders with default props', () => {
    const { getByText } = render(
      <HocWithI18n {...defaultProps} />,
    )
    expect(getByText('Success')).toBeInTheDocument()
    expect(getByText('Action completed successfully')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const { getByText } = render(
      <HocWithI18n {...defaultProps} closeText='Close' />,
    )
    const closeButton = getByText('Close')
    fireEvent.click(closeButton)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onSubmit when submit button is clicked', () => {
    const onSubmit = jest.fn()
    const { getByText } = render(
      <HocWithI18n {...defaultProps} onSubmit={onSubmit} submitText='Submit' />,
    )
    const submitButton = getByText('Submit')
    fireEvent.click(submitButton)
    expect(onSubmit).toHaveBeenCalled()
  })

  it('renders custom buttons', () => {
    const customButtons = <button type='button'>Custom Button</button>
    const { getByText } = render(
      <HocWithI18n {...defaultProps} customButtons={customButtons} />,
    )
    expect(getByText('Custom Button')).toBeInTheDocument()
  })

  it('renders beta badge when isBeta prop is true', () => {
    const { getByText } = render(
      <HocWithI18n {...defaultProps} isBeta />,
    )
    expect(getByText('beta.title')).toBeInTheDocument()
  })
})
