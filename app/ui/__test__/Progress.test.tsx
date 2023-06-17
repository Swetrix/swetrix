/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'

import Progress from '../Progress'

describe('Progress', () => {
  it('renders the progress bar', () => {
    const { getByTestId } = render(<Progress now={10} />)
    expect(getByTestId('progress')).toBeInTheDocument()
  })
})
