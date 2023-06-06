import React, { useEffect } from 'react'

const useOnClickOutside = (ref: React.RefObject<HTMLDivElement>, handler: Function) => {
  useEffect(() => {
    const func = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
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
