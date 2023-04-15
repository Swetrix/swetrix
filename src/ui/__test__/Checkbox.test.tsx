/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import Checkbox from '../Checkbox'

describe('Checkbox', () => {
  test('renders a checkbox', () => {
    const { getByText } = render(<Checkbox label='Checkbox' checked />)
    expect(getByText('Checkbox')).toBeInTheDocument()
  })

  test('renders a checkbox with a custom id', () => {
    const { getByRole } = render(
      <Checkbox id='custom-id' label='Checkbox' checked />,
    )
    expect(getByRole('checkbox')).toHaveAttribute('id', 'custom-id')
  })

  test('clicking the checkbox calls the onChange handler', () => {
    const onChange = jest.fn()
    const { getByRole } = render(
      <Checkbox label='Checkbox' checked onChange={onChange} />,
    )
    fireEvent.click(getByRole('checkbox'))
    expect(onChange).toHaveBeenCalled()
  })

  it('snapshot', () => {
    const { container } = render(<Checkbox label='Checkbox' checked />)
    expect(container).toMatchSnapshot()
  })
})
