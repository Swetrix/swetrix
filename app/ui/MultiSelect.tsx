import React from 'react'
import { MultiSelect } from 'react-multi-select-component'

const Multiselect = ({ items, selected, onSelect }: {
  items: {
    label: string,
    value: string,
    disabled?: boolean,
    key?: string,
  }[],
  selected: {
    label: string,
    value: string,
  }[],
  onSelect: (i: {
    label: string,
    value: string,
  }[]) => void,
}) => (
  <div>
    <h1>Select Fruits</h1>
    <pre>{JSON.stringify(selected)}</pre>
    <MultiSelect
      options={items}
      value={selected}
      onChange={onSelect}
      labelledBy='Select'
      isCreatable
    />
  </div>
)

export default Multiselect
