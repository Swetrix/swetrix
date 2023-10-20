/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import '@testing-library/jest-dom'
import _forEach from 'lodash/forEach'
import Select from '../Select'

describe('Select', () => {
  const defaultProps: {
    title: string,
    label: string,
    className?: string,
    items: any[],
    id?: string,
    labelExtractor?: (item: any, index: number) => string,
    keyExtractor?: (item: any, index: number) => string,
    iconExtractor?: (item: any, index: number) => JSX.Element | null,
    onSelect: (item: any) => void,
    capitalise: boolean,
  } = {
    title: 'Select Title',
    label: 'Select',
    items: [],
    onSelect: () => {},
    capitalise: true,
  }

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should render without errors', () => {
    const { getByText } = render(<Select {...defaultProps} />)
    expect(getByText(defaultProps.label)).toBeInTheDocument()
  })

  it('should render the title when provided', () => {
    const title = 'Select Title'
    const { getByText } = render(<Select {...defaultProps} title={title} />)
    expect(getByText(title)).toBeInTheDocument()
  })

  it('should render the description when provided', () => {
    const description = 'Select description'
    const { getByText } = render(<Select {...defaultProps} label={description} />)
    expect(getByText(description)).toBeInTheDocument()
  })

  it('should render the items when provided', () => {
    const items = ['Item 1', 'Item 2', 'Item 3']
    const { getByText } = render(<Select {...defaultProps} items={items} />)
    fireEvent.click(getByText(defaultProps.title))
    _forEach(items, (item) => {
      expect(getByText(item)).toBeInTheDocument()
    })
  })
})
