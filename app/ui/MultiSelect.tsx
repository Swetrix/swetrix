import React from 'react'
import Select from 'react-select'

const Multiselect = ({ items, selected, onSelect }: {
  items: {
    value: string | number,
    label: string | number,
  }[],
  selected: {
    value: string | number,
    label: string | number,
  }[],
  onSelect: (item: {
    value: string | number,
    label: string | number,
  }) => void,
}) => (
  <Select
    isMulti
    isSearchable
    // className='inline-flex w-full rounded-md border border-gray-300 shadow-sm px-3 md:px-4 py-2 bg-white text-sm font-medium text-gray-700 dark:text-gray-50 dark:border-gray-800 dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500'
    classNamePrefix='multiselect'
    options={items}
    value={selected}
    // @ts-ignore
    onChange={onSelect}
  />
)

export default Multiselect
