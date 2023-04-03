/* eslint-disable consistent-return */
import { useEffect, useRef, useState } from 'react'
import _get from 'lodash/get'

export default () => {
  const [size, setSize] = useState({
    width: 0, height: 0,
  })
  const ref = useRef(null)

  useEffect(() => {
    const DOMnode = ref.current
    if (!DOMnode) {
      return
    }
    const resizeObserver = new ResizeObserver((entries) => {
      setSize({
        width: _get(entries, '0.contentRect.width', 0),
        height: _get(entries, '0.contentRect.height', 0),
      })
    })
    resizeObserver.observe(DOMnode)
    return () => {
      resizeObserver.unobserve(DOMnode)
    }
  }, [])

  return [ref, size]
}
