/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render, cleanup } from '@testing-library/react'
import Chart from '../Chart'

describe('Chart component', () => {
  afterEach(cleanup)

  const options = {
    data: {
      columns: [
        ['data1', 30, 200, 100, 400, 150, 250],
        ['data2', 50, 20, 10, 40, 15, 25],
      ],
    },
  }

  it('should render the chart', () => {
    const { getByTestId } = render(<Chart current='chart' options={options} />)
    expect(getByTestId('chart')).toBeInTheDocument()
  })

  it('snapshot', () => {
    const { container } = render(<Chart current='chart' options={options} />)
    expect(container).toMatchSnapshot()
  })
})
