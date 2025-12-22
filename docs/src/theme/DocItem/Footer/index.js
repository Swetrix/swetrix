import React from 'react'
import OriginalFooter from '@theme-original/DocItem/Footer'
import FeedbackWidget from '@site/src/components/FeedbackWidget'

export default function FooterWrapper(props) {
  return (
    <>
      <OriginalFooter {...props} />
      <FeedbackWidget />
    </>
  )
}
