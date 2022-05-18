import { useEffect } from 'react'
import { useHistory } from 'react-router-dom'

/**
  * A HOC which listens to history changes and scrolls to top of the page when triggered.
  *
  * @component
  * @param {HTMLElement} children The children covered by the listener.
  */
const ScrollToTop = ({ children }) => {
  const history = useHistory()

  useEffect(() => {
    const unlisten = history.listen(({ hash }) => {
      if (hash === '') {
        setTimeout(() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          })
        }, 0)
      }
    })
    return unlisten
  }, [history])

  return children
}

export default ScrollToTop
