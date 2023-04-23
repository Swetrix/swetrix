/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'
import Pagination from '../Pagination'

describe('Pagination', () => {
  let defaultProps: {
    page: number,
    setPage: (item: number) => void,
    pageAmount: number,
    total: number,
  } = {
    page: 1,
    setPage: () => {
      defaultProps.page += 1
    },
    pageAmount: 10,
    total: 100,
  }

  // use HOC to wrap component with I18nextProvider
  const HocWithI18n = (props: any): JSX.Element => (
    <I18nextProvider i18n={i18n}>
      <Pagination {...props} />
    </I18nextProvider>
  )

  // initialize i18n before each test
  beforeEach(() => {
    i18n.init({
      lng: 'en',
      resources: {
        en: {
          project: {
            prev: 'project.prev',
            next: 'project.next',
          },
        },
      },
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
    defaultProps = {
      page: 1,
      setPage: () => {
        defaultProps.page += 1
      },
      pageAmount: 10,
      total: 100,
    }
  })

  it('renders with default props', () => {
    const { getByText } = render(
      <HocWithI18n {...defaultProps} />,
    )
    expect(getByText('1')).toBeInTheDocument()
    expect(getByText('10')).toBeInTheDocument()
    expect(getByText('project.next')).toBeInTheDocument()
  })

  it('renders on page > 1', () => {
    defaultProps.page = 2
    const { getByText } = render(
      <HocWithI18n {...defaultProps} />,
    )
    expect(getByText('1')).toBeInTheDocument()
    expect(getByText('10')).toBeInTheDocument()
    expect(getByText('project.prev')).toBeInTheDocument()
    expect(getByText('project.next')).toBeInTheDocument()
  })

  it('renders on page > 1 and page < pageAmount', () => {
    defaultProps.page = 5
    const { getByText } = render(
      <HocWithI18n {...defaultProps} />,
    )
    expect(getByText('1')).toBeInTheDocument()
    expect(getByText('10')).toBeInTheDocument()
    expect(getByText('project.prev')).toBeInTheDocument()
    expect(getByText('project.next')).toBeInTheDocument()
  })

  it('renders on page = pageAmount', () => {
    defaultProps.page = 10
    const { getByText } = render(
      <HocWithI18n {...defaultProps} />,
    )
    expect(getByText('1')).toBeInTheDocument()
    expect(getByText('10')).toBeInTheDocument()
    expect(getByText('project.prev')).toBeInTheDocument()
  })

  it('renders on page = pageAmount and pageAmount < total', () => {
    defaultProps.page = 10
    defaultProps.total = 101
    const { getByText } = render(
      <HocWithI18n {...defaultProps} />,
    )
    expect(getByText('1')).toBeInTheDocument()
    expect(getByText('11')).toBeInTheDocument()
    expect(getByText('project.prev')).toBeInTheDocument()
  })
})
