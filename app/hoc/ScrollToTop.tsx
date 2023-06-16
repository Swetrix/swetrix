// import React, { useEffect } from 'react'
import React from 'react'
// import { useNavigate, useLocation } from '@remix-run/react'
// import _isEmpty from 'lodash/isEmpty'

interface IScrollToTop {
  children: JSX.Element
}

// interface StateType {
//   scrollToTopDisable?: boolean
// }

// interface IHistoryListener {
//   hash: string
//   state?: StateType | null
// }

// TODO: FIX THIS HOC

/**
  * A HOC which listens to history changes and scrolls to top of the page when triggered.
  *
  * To disable Scroll to top on history.push, you should pass scrollToTopDisable: true state, e.g.:
  * history.push({
  *   state: {
  *     scrollToTopDisable: true,
  *   },
  * })
  *
  * @component
  * @param {HTMLElement} children The children covered by the listener.
  */
const ScrollToTop: React.FC<IScrollToTop> = ({ children }) => {
  // const location = useLocation()

  // useEffect(() => {
  //   const { hash, state } = location

  //   if (!_isEmpty(state) && state?.scrollToTopDisable) {
  //     return
  //   }

  //   if (hash !== '') {
  //     return
  //   }

  //   setTimeout(() => {
  //     window.scrollTo({
  //       top: 0,
  //       behavior: 'smooth',
  //     })
  //   }, 0)
  // }, [location])

  return children
}

export default ScrollToTop
