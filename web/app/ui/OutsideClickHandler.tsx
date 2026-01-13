import React, { useRef } from 'react'

import useOnClickOutside from '~/hooks/useOnClickOutside'

interface OutsideClickHandlerProps extends React.HTMLAttributes<HTMLDivElement> {
  onOutsideClick: (event: MouseEvent | TouchEvent) => void
}

const OutsideClickHandler: React.FC<
  React.PropsWithChildren<OutsideClickHandlerProps>
> = ({ onOutsideClick, children, ...rest }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(containerRef, onOutsideClick)

  return (
    <div ref={containerRef} {...rest}>
      {children}
    </div>
  )
}

export default OutsideClickHandler
