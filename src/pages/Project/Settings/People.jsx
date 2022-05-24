import React, { useState } from 'react'
import Button from 'ui/Button'
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/solid'
import { ActivePin } from 'ui/Pin'

const People = () => {
  const [open, setOpen] = useState(false)

  return (
    <div className='mt-6 mb-6'>
      <div className='flex justify-between items-center mb-3'>
        <div>
          <h3 className='mt-2 text-lg font-bold text-gray-900 dark:text-gray-50'>People</h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>Invite your coworkers</p>
        </div>
        <Button onClick={() => {}} className='h-8' primary regular type='button'>add Users</Button>
      </div>
      <div>
        <ul className='divide-y divide-gray-200 dark:divide-gray-700'>
          <li className='py-4'>
            <div className='flex justify-between'>
              <p className='text-gray-700 dark:text-gray-200'>maks.mrug.ru@gmail.com</p>
              <div className='relative'>
                <ActivePin label='Pannding' className='inline-flex items-center shadow-sm px-2.5 py-0.5 mr-3' />
                <button onClick={() => setOpen(!open)} type='button' className='inline-flex items-center shadow-sm px-2.5 py-0.5 border border-gray-200 dark:border-gray-500 text-sm leading-5 font-medium rounded-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'>
                  Viewer
                  <ChevronDownIcon style={{ transform: open ? 'rotate(180deg)' : '' }} className='w-4 h-4 pt-px ml-1' />
                </button>
                {open && (
                  <ul className='origin-top-right absolute z-10 right-0 mt-2 w-72 rounded-md shadow-lg overflow-hidden bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 focus:outline-none'>
                    <li className='p-4 hover:bg-indigo-600 group cursor-pointer flex justify-between items-center'>
                      <div>
                        <p className='font-bold text-gray-700 dark:text-gray-200 group-hover:text-gray-200'>Admin</p>
                        <p className='mt-1 text-sm text-gray-500 group-hover:text-gray-200'>View stats and settings project</p>
                      </div>
                      <span className='text-indigo-600 group-hover:text-gray-200'>
                        <CheckIcon className='w-7 h-7 pt-px ml-1' />
                      </span>
                    </li>
                    {/* next element */}
                    <li className='p-4 hover:bg-indigo-600 group cursor-pointer flex justify-between items-center'>
                      <div>
                        <p className='font-bold text-gray-700 dark:text-gray-200 group-hover:text-gray-200'>Viewer</p>
                        <p className='mt-1 text-sm text-gray-500 group-hover:text-gray-200'>View stats only</p>
                      </div>
                    </li>
                  </ul>
                )}
              </div>
            </div>
          </li>
          {/* next element */}
          <li className='py-4'>
            <div className='flex justify-between'>
              <p className='text-gray-700 dark:text-gray-200'>brawlstar.ua@gmail.com</p>
              <button type='button' className='inline-flex items-center shadow-sm px-2.5 py-0.5 border border-gray-200 dark:border-gray-500 text-sm leading-5 font-medium rounded-full bg-white dark:bg-gray-700 text-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'>
                Viewer
                <svg className='w-4 h-4 pt-px ml-1' fill='currentColor' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'><path fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd' /></svg>
              </button>
            </div>
          </li>
        </ul>
      </div>
      <Button type='submit' className='mt-3 ' primary regular>
        save
      </Button>
    </div>
  )
}

export default People
