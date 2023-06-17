import React from 'react'

let isHydrating = true

const RenderOnClient = ({ children }: { children: React.ReactNode }) => {
  const [isHydrated, setIsHydrated] = React.useState(
    !isHydrating,
  )

  React.useEffect(() => {
    isHydrating = false
    setIsHydrated(true)
  }, [])

  if (isHydrated) {
    return children
  }

  return (
    <div className='loader' id='loader'>
      <div className='loader-head'>
        <div className='first' />
        <div className='second' />
      </div>
      <div className='logo-frame'>
        <img className='logo-frame-img' width='361' height='80' src='assets/logo_blue.png' alt='Swetrix' />
      </div>
    </div>
  )
}

export default RenderOnClient
