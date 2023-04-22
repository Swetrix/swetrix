/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render } from '@testing-library/react'

import Progress from '../Progress'

describe('Progress', () => {
  it('should render', () => {
    const { container } = render(<Progress now={50} />)
    expect(container).toMatchSnapshot()
  })
})
