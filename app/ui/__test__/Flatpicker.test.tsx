/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import Flatpicker from '../Flatpicker'

describe('Flatpicker', () => {
  test('renders a flatpicker', () => {
    const { getByTestId } = render(<Flatpicker />)
    expect(getByTestId('calendar')).toBeInTheDocument()
  })
})
