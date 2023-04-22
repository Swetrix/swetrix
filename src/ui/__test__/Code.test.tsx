/* eslint-disable testing-library/prefer-screen-queries */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react'
import { render } from '@testing-library/react'
import Code from '../Code'

describe('Code component', () => {
  const testText = 'const greeting = "Hello, world!";'
  const testLanguage = 'javascript'

  it('renders the correct text and language', () => {
    const { getByText } = render(
      <Code text={testText} language={testLanguage} />,
    )
    const codeElement = getByText(testText)
    expect(codeElement).toBeInTheDocument()
    expect(codeElement).toHaveClass(`language-${testLanguage}`)
  })

  it('applies any additional className passed in as a prop', () => {
    const testClassName = 'test-class'
    const { container } = render(
      <Code text={testText} language={testLanguage} className={testClassName} />,
    )
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.firstChild).toHaveClass(testClassName)
  })
})
