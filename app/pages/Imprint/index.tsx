/* eslint-disable react/no-unescaped-entities */
import React from 'react'

import { CONTACT_EMAIL } from 'redux/constants'

const Imprint = (): JSX.Element => {
  return (
    <div className='bg-gray-50 dark:bg-slate-900 min-h-min-footer'>
      <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8'>
        <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight'>Imprint</h1>
        <p className='mt-4 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          Swetrix Ltd
          <br />
          International House, 38 Thistle Street, Edinburgh, United Kingdom, EH2 1EN
          <br />
          Company number SC797389
          <br />
          <br />
          Represented by Andrii Romasiun
          <br />
          Email: {CONTACT_EMAIL}
        </p>
      </div>
    </div>
  )
}

export default Imprint
