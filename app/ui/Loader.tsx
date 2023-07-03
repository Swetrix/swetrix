import React from 'react'
import Spin from './icons/Spin'

const Loader = () => (
  <div className='flex justify-center pt-10'>
    <Spin />
    <span className='sr-only'>Loading...</span>
  </div>
)

export default Loader
