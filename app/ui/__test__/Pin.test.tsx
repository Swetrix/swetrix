/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  WarningPin, ActivePin, InactivePin, CustomPin,
} from '../Pin'

describe('Pin', () => {
  const defaultProps: {
    label: string,
    className?: string,
  } = {
    label: 'label',
    className: 'className',
  }

  it('renders the warning pin', () => {
    const { getByText } = render(<WarningPin {...defaultProps} />)
    expect(getByText('label')).toBeInTheDocument()
  })

  it('renders the active pin', () => {
    const { getByText } = render(<ActivePin {...defaultProps} />)
    expect(getByText('label')).toBeInTheDocument()
  })

  it('renders the inactive pin', () => {
    const { getByText } = render(<InactivePin {...defaultProps} />)
    expect(getByText('label')).toBeInTheDocument()
  })

  it('renders the custom pin', () => {
    const { getByText } = render(<CustomPin {...defaultProps} />)
    expect(getByText('label')).toBeInTheDocument()
  })

  it('renders the custom pin with custom className', () => {
    const { getByText } = render(<CustomPin {...defaultProps} className='customClassName' />)
    expect(getByText('label')).toBeInTheDocument()
  })
})
