import React from 'react'

interface IHighlighted {
  children: React.ReactNode,
}

const Highlighted = ({ children }: IHighlighted) => (
  <span className='px-1 bg-slate-200 text-gray-900 rounded  dark:text-gray-50 dark:bg-slate-700'>
    {children}
  </span>
)

export default Highlighted
