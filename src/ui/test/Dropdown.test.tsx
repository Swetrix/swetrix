/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import Dropdown from '../Dropdown'

describe('Dropdown', () => {
  const items = ['Item 1', 'Item 2', 'Item 3']
  const onSelect = jest.fn()
  const defaultProps = {
    title: 'Dropdown Title',
    onSelect,
    items,
  }

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should render without errors', () => {
    const { getByText } = render(<Dropdown {...defaultProps} />)
    expect(getByText(defaultProps.title)).toBeInTheDocument()
  })

  it('should render the description when provided', () => {
    const description = 'Dropdown description'
    const { getByText } = render(<Dropdown {...defaultProps} desc={description} />)
    expect(getByText(description)).toBeInTheDocument()
  })

  it('should call onSelect when an item is clicked', () => {
    const { getByText } = render(<Dropdown {...defaultProps} />)
    const btnOpen = getByText(defaultProps.title)
    fireEvent.click(btnOpen)
    const item = getByText(items[0])
    fireEvent.click(item)
    expect(onSelect).toHaveBeenCalledWith(items[0])
  })
})
