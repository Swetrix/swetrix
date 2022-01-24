import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
  * A HOC which listens to history changes and scrolls to top of the page when triggered.
  *
  * @component
  * @param {HTMLElement} children The children covered by the listener.
  */
const ScrollToTop = ({ children }) => {
  const location = useLocation()

  useEffect(() => {
    if (location.hash === '') {
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
      }, 0)
    }
    // const unlisten = location.listen(({ hash }) => {
    //   if (hash === '') {
    //     setTimeout(() => {
    //       window.scrollTo({
    //         top: 0,
    //         behavior: 'smooth',
    //       })
    //     }, 0)
    //   }
    // })
    // return unlisten
  }, [location])

  return <>{children}</>
}

export default ScrollToTop
