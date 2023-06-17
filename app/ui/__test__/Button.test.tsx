/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable testing-library/prefer-screen-queries */
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Button from '../Button'

describe('Button component', () => {
  it('renders with text', () => {
    const { getByText } = render(<Button text='Click me' />)
    expect(getByText('Click me')).toBeInTheDocument()
  })

  it('renders with children', () => {
    const { getByText } = render(<Button><span>Click me</span></Button>)
    expect(getByText('Click me')).toBeInTheDocument()
  })

  it('handles clicks', () => {
    const onClick = jest.fn()
    const { getByRole } = render(<Button onClick={onClick} />)
    fireEvent.click(getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a primary button', () => {
    const { getByText } = render(<Button text='Click me' primary />)
    const button = getByText('Click me')
    expect(button).toHaveClass('bg-slate-900')
  })

  it('renders a secondary button', () => {
    const { getByText } = render(<Button text='Click me' secondary />)
    const button = getByText('Click me')
    expect(button).toHaveClass('bg-slate-300')
  })

  it('renders a white button', () => {
    const { getByText } = render(<Button text='Click me' white />)
    const button = getByText('Click me')
    expect(button).toHaveClass('bg-white')
  })

  it('renders a danger button', () => {
    const { getByText } = render(<Button text='Click me' danger />)
    const button = getByText('Click me')
    expect(button).toHaveClass('bg-red-500')
  })

  it('renders a semi-danger button', () => {
    const { getByText } = render(<Button text='Click me' semiDanger />)
    const button = getByText('Click me')
    expect(button).toHaveClass('border-red-600')
  })

  it('renders a small button', () => {
    const { getByText } = render(<Button text='Click me' small />)
    const button = getByText('Click me')
    expect(button).toHaveClass('text-xs')
  })

  it('renders a semi-small button', () => {
    const { getByText } = render(<Button text='Click me' semiSmall />)
    const button = getByText('Click me')
    expect(button).toHaveClass('text-sm')
  })

  it('renders a regular button', () => {
    const { getByText } = render(<Button text='Click me' regular />)
    const button = getByText('Click me')
    expect(button).toHaveClass('text-sm')
  })

  it('renders a large button', () => {
    const { getByText } = render(<Button text='Click me' large />)
    const button = getByText('Click me')
    expect(button).toHaveClass('text-sm')
  })

  it('renders a giant button', () => {
    const { getByText } = render(<Button text='Click me' giant />)
    const button = getByText('Click me')
    expect(button).toHaveClass('text-base')
  })

  it('renders a button with no border', () => {
    const { getByText } = render(<Button text='Click me' noBorder />)
    const button = getByText('Click me')
    expect(button).toHaveClass('border-none')
  })
})
