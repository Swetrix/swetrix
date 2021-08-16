import React from 'react'

import Pricing from '../MainPage/Pricing'
import Title from 'components/Title'

const Features = () => {
  return (
    <Title title='Billing'>
      <div className='bg-gray-50'>
        <div className='w-11/12 md:w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8'>
          <h1 className='text-4xl mb-4 font-extrabold text-gray-900 tracking-tight'>Billing &amp; Plans</h1>
          <p className='text-lg text-gray-900 tracking-tight'>
            It is free to get started and use our services.<br />
            If you need to handle more traffic, you probably need to upgrade your plan.<br />
            Below is a list of available plans. No hidden fees or other BS, everything is clear and transparent!
          </p>
          <Pricing />
          <p className='text-lg text-gray-900 tracking-tight mt-10'>
            Need to track more than 1 million events per month?<br />
            Contact us at&nbsp;
            <a href='mailto:contact@swetrix.com' className='font-medium text-indigo-600 hover:text-indigo-500'>
              contact@swetrix.com
            </a>
            &nbsp;
            to discuss your needs.
          </p>
        </div>
      </div>
    </Title>
  )
}

export default Features
