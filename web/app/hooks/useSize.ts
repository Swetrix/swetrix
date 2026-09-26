import _get from 'lodash/get'
import type { MutableRefObject } from 'react'
import { useEffect, useRef, useState } from 'react'

const useSize = ({ trackHeight = true }: { trackHeight?: boolean } = {}): [
  MutableRefObject<null>,
  { width: number; height: number },
] => {
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  })
  const ref = useRef(null)

  useEffect(() => {
    const DOMnode = ref.current
    if (!DOMnode) {
      return
    }
    const resizeObserver = new ResizeObserver((entries) => {
      const width = _get(entries, '0.contentRect.width', 0)
      const height = trackHeight ? _get(entries, '0.contentRect.height', 0) : 0

      setSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      )
    })
    resizeObserver.observe(DOMnode)
    return () => {
      resizeObserver.unobserve(DOMnode)
    }
  }, [trackHeight])

  return [ref, size]
}

export default useSize
