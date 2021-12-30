import React from 'react'
import Spin from './icons/Spin'

const Loader = () => (
  <div className='flex justify-center pt-10'>
    <Spin className='h-20 w-20 text-indigo-700' />
    <span className='sr-only'>Loading...</span>
  </div>
)

export default Loader
