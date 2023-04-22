/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import Input from '../Input'

describe('Input component', () => {
  it('renders label, input and hint', () => {
    const { getAllByText, getByText, getByPlaceholderText } = render(
      <Input label='Username' hint='Enter your username' placeholder='Enter your username' />,
    )
    expect(getAllByText(/username/i)).toHaveLength(2)
    expect(getByText(/enter your username/i)).toBeInTheDocument()
    expect(getByPlaceholderText(/enter your username/i)).toBeInTheDocument()
  })

  it('calls onChange callback when input value changes', () => {
    const handleChange = jest.fn()
    const { getByRole } = render(<Input label='Username' onChange={handleChange} />)
    const input = getByRole('textbox')
    fireEvent.change(input, { target: { value: 'John' } })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('displays error message when error prop is truthy', () => {
    const { getByRole, getByText } = render(<Input label='Username' error='Username is required' />)
    const input = getByRole('textbox')
    fireEvent.blur(input)
    expect(getByText(/username is required/i)).toBeInTheDocument()
  })

  it('disables input when disabled prop is true', () => {
    const { getByRole } = render(<Input label='Username' disabled />)
    const input = getByRole('textbox') as HTMLInputElement
    expect(input).toBeDisabled()
  })

  it('snapshot', () => {
    const { container } = render(<Input label='Username' />)
    expect(container).toMatchSnapshot()
  })
})
