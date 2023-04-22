/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render } from '@testing-library/react'

import Progress from '../Progress'

describe('Progress', () => {
  it('renders the progress bar', () => {
    const { getByTestId } = render(<Progress />)
    expect(getByTestId('progress')).toBeInTheDocument()
  })
})
