import React from 'react'
import { RefreshIcon } from '@heroicons/react/outline'

const Loader = () => (
  <div className='flex justify-center mt-10'>
    <RefreshIcon className='animate-spin transform rotate-180 h-20 w-20 text-indigo-700' />
    <span className='sr-only'>Loading...</span>
  </div>
)

export default Loader
