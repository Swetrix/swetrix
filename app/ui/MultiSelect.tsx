import React, { useState } from 'react'
import cx from 'clsx'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import _map from 'lodash/map'
import _includes from 'lodash/includes'
import _isEmpty from 'lodash/isEmpty'

interface IMultiSelect {
  className?: string
  onRemove: (item: any) => void
  onSelect: (item: any) => void
  items: any[]
  labelExtractor?: (item: any) => string
  keyExtractor?: (item: any) => string
  label: any[]
  hint?: string
  placholder?: string
  searchPlaseholder?: string
  onSearch?: (search: string) => void
  itemExtractor?: (item: any) => string
}

const MultiSelect = ({
  onRemove,
  onSelect,
  items,
  labelExtractor,
  keyExtractor,
  label,
  hint,
  placholder = 'Select...',
  className,
  itemExtractor,
  searchPlaseholder = 'Search...',
  onSearch,
}: IMultiSelect) => {
  const [selected, setSelected] = useState(false)

  return (
    <div className={cx('keypress-multiselect flex w-full flex-col items-center', className)}>
      <div className='w-full'>
        <div className='relative flex flex-col items-center'>
          <div
            className='w-full cursor-pointer'
            onClick={() => {
              setSelected(!selected)
            }}
          >
            <div className='w-ful my-2 flex rounded border bg-white p-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100 dark:border-gray-800 dark:bg-slate-800 dark:text-gray-50 dark:hover:bg-slate-700 '>
              <div className='flex flex-auto flex-wrap'>
                {!_isEmpty(label) ? (
                  _map(label, (item) => (
                    <div
                      key={keyExtractor ? keyExtractor(item) : item}
                      className='m-1 flex items-center justify-center rounded-full border border-indigo-300 bg-indigo-100 px-2 py-1 font-medium text-indigo-700 dark:border-slate-500 dark:bg-slate-800 dark:text-gray-50'
                    >
                      <div className='flex max-w-full flex-initial break-words text-xs font-normal leading-none'>
                        {labelExtractor ? labelExtractor(item) : item}
                      </div>
                      <div className='flex flex-auto flex-row-reverse'>
                        <div
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onRemove(item)
                          }}
                        >
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            width='100%'
                            height='100%'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            className='feather feather-x ml-2 h-4 w-4 cursor-pointer rounded-full hover:text-indigo-400'
                          >
                            <line x1='18' y1='6' x2='6' y2='18' />
                            <line x1='6' y1='6' x2='18' y2='18' />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className='flex items-center justify-center px-2 text-gray-300 dark:text-gray-50'>{placholder}</p>
                )}
              </div>
              <div className='flex w-8 items-center border-l border-gray-200 py-1 pl-2 pr-1 text-gray-300'>
                <button
                  type='button'
                  onClick={() => setSelected(!selected)}
                  className='h-6 w-6 cursor-pointer text-gray-600 outline-none focus:outline-none dark:text-gray-300'
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='100%'
                    height='100%'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className=' h-4 w-4 rotate-180'
                  >
                    <polyline points='18 15 12 9 6 15' />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          {selected && (
            <div className=' top-100 lef-0 max-h-select z-40 max-h-[200px] w-full overflow-y-auto overflow-x-hidden rounded bg-white shadow dark:bg-slate-800'>
              <div className='flex w-full flex-col'>
                {onSearch && (
                  <div className='relative w-full cursor-pointer rounded-t border-b border-gray-100 hover:bg-indigo-100 dark:border-slate-700 dark:hover:bg-slate-700'>
                    <input
                      className='focus:box-shadow-none relative flex w-full items-center overflow-x-auto border-l-2 border-transparent bg-white p-2 pl-2 hover:border-b-indigo-100 focus:border-transparent focus:outline-none focus:ring-0 dark:bg-slate-800 dark:hover:border-b-slate-700'
                      placeholder={searchPlaseholder}
                      onChange={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onSearch(e.target.value || '')
                      }}
                      type='text'
                    />
                    <MagnifyingGlassIcon
                      className='absolute right-2 top-[0.7rem] h-5 w-5 text-gray-400 dark:text-gray-300'
                      aria-hidden='true'
                    />
                  </div>
                )}
                {_map(items, (item) => (
                  <div
                    key={keyExtractor ? `${keyExtractor(item)}select` : `${item}select`}
                    onClick={() => onSelect(item)}
                    className='w-full cursor-pointer rounded-t border-b border-gray-100 hover:bg-indigo-100 dark:border-slate-500 dark:hover:bg-slate-700'
                  >
                    <div
                      className={cx(
                        'relative flex w-full items-center overflow-x-auto border-l-2 border-transparent p-2 pl-2 hover:border-indigo-100 dark:hover:border-slate-700',
                        {
                          'border-l-2 !border-indigo-500 dark:!border-slate-400': _includes(label, item),
                        },
                      )}
                    >
                      <div className='flex w-full items-center break-words'>
                        <div className='mx-2 flex leading-6'>{itemExtractor ? itemExtractor(item) : item}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {hint && <p className='mt-2 whitespace-pre-line text-sm text-gray-500 dark:text-gray-300'>{hint}</p>}
    </div>
  )
}

export default MultiSelect
