import React from 'react'

interface HighlightedProps {
  children: React.ReactNode
}

const Highlighted = ({ children }: HighlightedProps) => (
  <span className='rounded-sm bg-slate-200 px-1 text-gray-900 dark:bg-slate-700 dark:text-gray-50'>{children}</span>
)

export default Highlighted
