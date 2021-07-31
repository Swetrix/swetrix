import React from 'react'
import { Link } from 'react-router-dom'

import Title from 'components/Title'
import routes from 'routes'

const Features = () => {
  return (
    <Title title='Features'>
      <div className='bg-gray-50'>
        <div className='w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8'>
          <h1 className='text-4xl font-extrabold text-gray-900 tracking-tight'>Features</h1>

          <h3 className='text-2xl font-normal text-gray-900 tracking-tight mt-4'>Transparency</h3>
          <p className='text-lg text-gray-900 tracking-tight'>
            At Swetrix, we believe that everyone has a right to privacy and transparency, especially when it comes to analytics.<br />
            We do not collect more information than we <Link className='text-indigo-600 hover:text-indigo-500' to={`${routes.docs}#docs-tv`}>claim</Link>, all data is stored on servers physically located in the European Union and our analytics script is publicly available and accessible to all on our <a className='text-indigo-600 hover:text-indigo-500' href='https://github.com/Swetrix' target='_blank' rel='noopener noreferrer'>Github</a>.<br />
          </p>

          <h3 className='text-2xl font-normal text-gray-900 tracking-tight mt-4'>Simplicity</h3>
          <p className='text-lg text-gray-900 tracking-tight'>
            When we created our service we tried to make it as simple and flexible as possible.<br />
            No more confusing metrics and complicated dashboards - with us you can have control over all your projects and data in a simple and straightforward way.
          </p>

          <h3 className='text-2xl font-normal text-gray-900 tracking-tight mt-4'>Page Views Tracking</h3>
          <p className='text-lg text-gray-900 tracking-tight'>
            Swetrix offers the ability to track page views, including unique views as well as user flow.<br />
            All views include a wide range of data, such as user country, locale, device type, page load time, and more.<br />
            We do not use cookies or any other type of user profiling to collect data. All incoming data is anonymised, ensuring that users cannot be tracked down in any way based on this.
          </p>

          <h3 className='text-2xl font-normal text-gray-900 tracking-tight mt-4'>Custom Events Tracking</h3>
          <p className='text-lg text-gray-900 tracking-tight'>
            In addition to tracking page views, we also offer the ability to track сustom events.<br />
            You can track any event, such as button clicks, registrations or authorisations.<br />
            All of this is also completely private to the user, as we don't store any other information about them along with the events.<br />
            You can read more about custom events in our documentation.
          </p>

          <h3 className='text-2xl font-normal text-gray-900 tracking-tight mt-4'>Speed</h3>
          <p className='text-lg text-gray-900 tracking-tight'>
            We are fast. Our analytics script is as optimised as possible and uses CDNs for its delivery, which ensures that the script won't slow down your sites.
          </p>

          <h3 className='text-2xl font-normal text-gray-900 tracking-tight mt-4'>Trust</h3>
          <p className='text-lg text-gray-900 tracking-tight'>
            We are a small business, not a big corporation.<br />
            We are interested in creating a good and quality product that will be used by satisfied customers, not in squeezing as much money as possible from our users or selling your personal data. 
          </p>
        </div>
      </div>
      <div className='bg-indigo-600'>
        <div className='w-4/5 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 lg:flex lg:items-center lg:justify-between'>
          <h2 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900'>
            <span className='block text-white'>Ready to get to know your users?</span>
            <span className='block text-gray-300'>
              Start using Swetrix today.
            </span>
          </h2>
          <div className='mt-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-5'>
            <Link
              to={routes.signup}
              className='flex items-center justify-center px-3 py-2 border border-transparent text-lg font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </Title>
  )
}

export default Features
