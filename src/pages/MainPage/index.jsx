import React from 'react'

import SignUp from '../Auth/Signup/BasicSignup'

// const SquareDots = ({ className }) => (
//   <div className='hidden sm:block sm:absolute sm:inset-0' aria-hidden='true'>
//     <svg
//       className={className}
//       width={364}
//       height={384}
//       viewBox='0 0 364 384'
//       fill='none'
//     >
//       <defs>
//         <pattern
//           id='eab71dd9-9d7a-47bd-8044-256344ee00d0'
//           x={0}
//           y={0}
//           width={20}
//           height={20}
//           patternUnits='userSpaceOnUse'
//         >
//           <rect x={0} y={0} width={4} height={4} fill='currentColor' />
//         </pattern>
//       </defs>
//       <rect width={364} height={384} fill='url(#eab71dd9-9d7a-47bd-8044-256344ee00d0)' />
//     </svg>
//   </div>
// )

const features = [
  {
    id: 1,
    name: 'Simple yet powerful',
    description: 'View all your analytics in a simple and straightforward way. Say no more to confusing reports, metrics and notifications.',
  },
  {
    id: 2,
    name: 'Open source',
    description: 'Our tracking script is open sourced and available for everybody to explore. We only track data that we declare.',
  },
  {
    id: 3,
    name: 'Full event tracking',
    description: 'With us you can not only track your traffic, but also custom events such as button clicks or registrations.',
  },
  {
    id: 4,
    name: 'No cookie banners needed',
    description: 'We don\'t do targeted advertising or profiling, and we don\'t rely on cookies at all. Our business model is to sell software, not data.',
  },
  {
    id: 5,
    name: 'We are fast',
    description: 'We use the fastest and most advanced technology in our applications, and our analytics script loads times faster than the competitors.',
  },
  {
    id: 6,
    name: 'Compare, explore and enjoy the data',
    description: 'You can view data by selected categories and also correlate statistics, such as separating unique users from regular page views.',
  },
]

const faqs = [
  {
    question: 'Question 1?',
    answer: 'Blah blah blah blah blah.',
  },
  {
    question: 'Question 2?',
    answer: 'Blah blah blah blah blah.',
  },
  {
    question: 'Question 3?',
    answer: 'Blah blah blah blah blah.',
  },
  {
    question: 'Question 4?',
    answer: 'Blah blah blah blah blah.',
  },
]

const FAQs = () => (
  <div className='bg-gray-50'>
    <div className='max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:py-20 lg:px-8'>
      <div className='lg:grid lg:grid-cols-3 lg:gap-8'>
        <div>
          <h2 className='text-3xl font-extrabold text-gray-900'>Frequently asked questions</h2>
          <p className='mt-4 text-lg text-gray-500'>
            Can’t find the answer you’re looking for? Reach out to our{' '}
            <a href='#/' className='font-medium text-indigo-600 hover:text-indigo-500'>
              customer support
            </a>{' '}
            team.
          </p>
        </div>
        <div className='mt-12 lg:mt-0 lg:col-span-2'>
          <dl className='space-y-12'>
            {faqs.map((faq) => (
              <div key={faq.question}>
                <dt className='text-lg leading-6 font-medium text-gray-900'>{faq.question}</dt>
                <dd className='mt-2 text-base text-gray-500'>{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  </div>
)

const Features = () => (
  <div className='bg-white'>
    <div className='max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8'>
      <h2 className='text-3xl font-extrabold text-gray-900 text-center'>Why us</h2>
      <div className='mt-12'>
        <dl className='space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:grid-rows-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3'>
          {features.map((faq) => (
            <div key={faq.id}>
              <dt className='text-lg leading-6 font-semibold text-gray-900'>{faq.name}</dt>
              <dd className='mt-2 text-base text-gray-500'>{faq.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  </div>
)

const Main = () => {
  return (
    <div className='relative bg-gray-800'>
      {/* <SquareDots className='absolute bottom-0 left-0 transform translate-x-0 mb-0 text-gray-700 lg:top-0 xl:transform-none lg:mt-72' /> */}
      {/* <SquareDots className='absolute bottom-0 right-0 transform translate-x-1/2 mb-48 text-gray-700 lg:top-0 lg:mb-0 xl:transform-none xl:translate-x-0 lg:mt-16' /> */}
      <div className='relative pt-6 pb-16 sm:pb-24'>
        <main className='mt-16 sm:mt-24'>
          <div className='mx-auto max-w-7xl'>
            <div className='lg:grid lg:grid-cols-12 lg:gap-8'>
              <div className='px-4 sm:px-6 sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left lg:flex lg:items-center'>
                <div>
                  <h1 className='mt-4 text-4xl tracking-tight font-extrabold text-white sm:mt-5 sm:leading-none lg:mt-6 lg:text-5xl xl:text-6xl'>
                    <span className='text-indigo-400 md:block'>Powerful</span>{' '}
                    <span className='md:block'>analytics platform that respects</span>{' '}
                    <span className='text-indigo-400 md:block'>user privacy</span>
                  </h1>
                  <p className='mt-3 text-base text-gray-300 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl'>
                    Swetrix brings an advanced and customisable analytics service for your web applications.<br />
                      Track every metric your bisuness needs without invading your users privacy.
                    </p>
                </div>
              </div>
              <div className='mt-16 sm:mt-24 lg:mt-0 lg:col-span-6'>
                <div className='bg-white sm:max-w-md sm:w-full sm:mx-auto sm:rounded-lg sm:overflow-hidden'>
                  <div className='px-4 py-8 sm:px-10'>
                    <p className='text-lg text-gray-900 text-center'>Sign up, it's free!</p>
                    <div className='mt-6'>
                      <SignUp />
                    </div>
                  </div>
                  <div className='px-4 py-6 bg-gray-50 border-t-2 border-gray-200 sm:px-10'>
                    <p className='text-xs leading-5 text-gray-500'>
                      By signing up, you agree to our{' '}
                      <a href='#/' className='font-medium text-gray-900 hover:underline'>
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a href='#/' className='font-medium text-gray-900 hover:underline'>
                        Privacy Policy
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <div className='relative'>
        <div className='absolute inset-0 flex flex-col' aria-hidden='true'>
          <div className='flex-1' />
          <div className='flex-1 w-full bg-white' />
        </div>
        <div className='max-w-7xl mx-auto px-4 sm:px-6'>
          <img
            className='relative rounded-lg shadow-lg'
            src='/assets/test_screenshot.png'
            alt='App screenshot'
          />
        </div>
      </div>

      <Features />

      <FAQs />

      <div className='bg-white'>
        <div className='max-w-4xl mx-auto py-16 px-4 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8 lg:flex lg:items-center lg:justify-between'>
          <h2 className='text-4xl font-extrabold tracking-tight text-gray-900 sm:text-4xl'>
            <span className='block'>Ready to get started?</span>
            <span className='block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent'>
              Explore our service or create an account.
            </span>
          </h2>
          <div className='mt-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-5'>
            <a
              href='#/'
              className='flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 bg-origin-border px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white hover:from-purple-700 hover:to-indigo-700'
            >
              Learn more
            </a>
            <a
              href='#/'
              className='flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
            >
              Get started
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Main
