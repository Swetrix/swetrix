/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render } from '@testing-library/react'
import Checkbox from '../Checkbox'

describe('Checkbox', () => {
  // do not use getByRole
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
})
