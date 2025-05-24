import _map from 'lodash/map'

const typesOfCookies = [
  {
    cookie: 'Essential cookies',
    description:
      'These cookies are strictly necessary to provide you with our website and use its functionalities. If you choose to disable these cookies via your internet browser, access and/or use of our website may be altered.',
  },
]

const CookiePolicy = () => {
  return (
    <div className='bg-gray-50 dark:bg-slate-900'>
      <div className='mx-auto w-11/12 px-4 pt-12 pb-16 sm:px-6 md:w-4/5 lg:px-8'>
        <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-50'>Cookie Policy</h1>
        <p className='text-md mt-4 text-gray-900 dark:text-gray-50'>
          Part of the provision of our service and this website relies on the collection of cookies. Depending on their
          use, they may be considered essential or subject to your explicit consent.
        </p>

        <h3 className='mt-4 text-2xl font-bold text-gray-900 dark:text-gray-50'>What is a cookie?</h3>
        <p className='text-md text-gray-900 dark:text-gray-50'>
          A cookie is a small text file that may be deposited and saved on the hard drive of your device (computer,
          tablet, smartphone, etc.) when you visit our website. It allows us or third parties to identify the device on
          which it has been saved and to keep record of certain information relating to your journey in order, for
          instance, to simplify your visit on our website, to secure your connection or to adapt the content of a page
          to your interests.
        </p>

        <h3 className='mt-4 text-2xl font-bold text-gray-900 dark:text-gray-50'>
          What types of cookies are collected?
        </h3>
        <div className='text-md text-gray-900 dark:text-gray-50'>
          <div className='mt-2 flex flex-col'>
            <div className='-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8'>
              <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
                <div className='overflow-hidden ring-1 ring-black/5 md:rounded-lg'>
                  <table className='200 w-full min-w-full divide-y divide-gray-300 dark:divide-gray-500'>
                    <thead className='bg-gray-50 dark:bg-slate-800'>
                      <tr>
                        <th
                          scope='col'
                          className='w-1/5 py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-gray-50'
                        >
                          Cookie
                        </th>
                        <th
                          scope='col'
                          className='w-4/5 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-50'
                        >
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 bg-white dark:divide-gray-600 dark:bg-slate-800'>
                      {_map(typesOfCookies, ({ cookie, description }) => (
                        <tr key={cookie}>
                          <td className='w-1/5 px-3 py-4 text-sm text-gray-900 sm:pl-6 dark:text-gray-50'>{cookie}</td>
                          <td className='w-4/5 px-3 py-4 text-sm break-words text-gray-900 dark:text-gray-50'>
                            {description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h3 className='mt-4 text-2xl font-bold text-gray-900 dark:text-gray-50'>How to manage cookies?</h3>
        <p className='text-md text-gray-900 dark:text-gray-50'>
          Your internet browser may allow you to manage your cookie preferences by removing or rejecting them via your
          browser settings (usually located in "help", “tools” or “edit” sections). Remember that if you choose to
          disable our cookies, you may experience some inconvenience when using our website.
        </p>

        <hr className='mt-10 mb-4 border-gray-200 dark:border-gray-600' />
        <p className='text-md text-gray-900 dark:text-gray-50'>
          <i>Last updated: February 4, 2023.</i>
        </p>
      </div>
    </div>
  )
}

export default CookiePolicy
