import { useEffect } from 'react'

const useOnClickOutside = (ref, handler) => {
  useEffect(() => {
    const func = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return
      }
      handler(event)
    }

    document.addEventListener('mousedown', func)
    document.addEventListener('touchstart', func)

    return () => {
      document.removeEventListener('mousedown', func)
      document.removeEventListener('touchstart', func)
    }
  }, [ref, handler])

  return [ref, handler]
}

export default useOnClickOutside
