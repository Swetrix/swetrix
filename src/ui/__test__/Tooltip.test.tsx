/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import Tooltip from '../Tooltip'

describe('Tooltip', () => {
  it('should render the tooltip text when hovering over the icon', () => {
    const text = 'This is a tooltip'
    const { getByTestId, getByText } = render(
      <Tooltip text={text} />,
    )
    const tooltipIcon = getByTestId('tooltip-icon')
    fireEvent.mouseEnter(tooltipIcon)
    const tooltipText = getByText(text)
    expect(tooltipText).toBeInTheDocument()
  })

  it('should render a custom tooltip icon when provided', () => {
    const CustomIcon = () => <div data-testid='custom-icon' />
    const { getByTestId } = render(
      <Tooltip tooltipNode={<CustomIcon />} text='dds' />,
    )
    const customIcon = getByTestId('custom-icon')
    expect(customIcon).toBeInTheDocument()
  })

  it('should render a custom class name when provided', () => {
    const className = 'custom-class'
    const { getByTestId } = render(
      <Tooltip text='Tooltip' className={className} />,
    )
    const tooltipWrapper = getByTestId('tooltip-wrapper')
    expect(tooltipWrapper).toHaveClass(className)
  })

  it('snapshot', () => {
    const { container } = render(
      <Tooltip text='Tooltip' />,
    )
    expect(container).toMatchSnapshot()
  })
})
