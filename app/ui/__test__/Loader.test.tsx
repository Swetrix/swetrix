/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import Loader from '../Loader'

describe('Loader', () => {
  it('renders the loader with the "Loading..." text', () => {
    const { getByText } = render(<Loader />)
    expect(getByText('Loading...')).toBeInTheDocument()
  })
})
