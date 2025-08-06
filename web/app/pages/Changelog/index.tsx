import dayjs from 'dayjs'
import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { SWETRIX_VS_GOOGLE, DOCS_URL, CAPTCHA_URL, DOCS_CAPTCHA_URL } from '~/lib/constants'
import routes from '~/utils/routes'

const INTEGRATIONS_LINK = `${routes.user_settings}#integrations`

// Date format: YYYY-MM-DD
const changelog = [
  {
    date: '2024-07-01',
    changes: [
      'Added support for page properties (pageview metadata).',
      'Added support for filtering of custom events / pageview metadata keys and values.',
    ],
  },
  {
    date: '2024-06-16',
    changes: ['Removed support for Greek and Swedish languages.'],
  },
  {
    date: '2024-06-03',
    changes: ['Fixed flickering when users refreshed sessions view page.'],
  },
  {
    date: '2024-05-26',
    changes: ['Improved billboard.js chart styles.'],
  },
  {
    date: '2024-05-24',
    changes: [
      'Fixed a crash which happened when users selected Bar chart view and refreshed the page.',
      'Refactored and redesigned several UI components used within Swetrix website.',
    ],
  },
  {
    date: '2024-05-11',
    changes: [
      'Fixed loading indicators for sessions / errors pages.',
      'Fixed incorrect icon colours for the error page.',
      'Removed russian language from the list of our supported locales.',
      'Fixed broken "Load more" feature for the sessions page.',
      'Improved the CAPTCHA analytics dashboard UI and fixed a few minor issues.',
      'Added support for 12/24 hour time notation for the sessions page.',
    ],
  },
  {
    date: '2024-05-06',
    changes: [
      <>
        Introducing:{' '}
        <Link to={routes.errorTracking} className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'>
          Client-side error tracking
        </Link>
        . Now you can analyse what kind or errors happen on your website, when they happen and how often. All of that
        within convenient and easy-to-use Swetrix dashboard.
      </>,
    ],
  },
  {
    date: '2024-03-26',
    changes: [
      'Introduced new "Load time allocation" metric to the Performance page.',
      'Added a selector for performance aggregation function. Now you can choose between average, median and 95th quantile data aggregation.',
    ],
  },
  {
    date: '2024-03-11',
    changes: [
      'When creating a new project, you will now get an individual, copy-pastable tracking code to add to your website (instead of looking for it in our documentation).',
      'Overall website UI and UX improvements.',
    ],
  },
  {
    date: '2024-02-19',
    changes: ['Added Hotkeys feature to the analytics dashboard page.'],
  },
  {
    date: '2024-02-16',
    changes: [
      'Fixed a bug when some modals where not closable.',
      'Session analysis: sessions can be opened in a new tab now.',
      'Reworked billing system and introduced the concept of locked dashboards. Now, instead of completely disregarding all incoming events in case of payment failure, ending trial or something like that, we will accept the events, but limit account functionalities until the issue is resolved.',
    ],
  },
  {
    date: '2024-01-10',
    changes: [
      'Removed % from panels on the Performance tab.',
      'Displaying human readable locales (e.g. Polish (Poland) instead of pl-PL) in dashboard.',
    ],
  },
  {
    date: '2023-12-22',
    changes: [
      'Added sessions overview (clickstream) feature. Now you can inspect sessions, see the pageflow and analyse what custom events occured within a session.',
    ],
  },
  {
    date: '2023-11-17',
    changes: [
      'Redesigned dashboard page UI.',
      'Fixed an issue with broken birds eye view for custom events.',
      'Displaying + and - for value changes for bounce rate and session duration metrics.',
    ],
  },
  {
    date: '2023-10-20',
    changes: [
      'Added funnels feature.',
      'Fixed a bug which caused signed in users to be redirected on a password-protected project page.',
    ],
  },
  {
    date: '2023-10-17',
    changes: ['Added support for cumulative mode visualisation.'],
  },
  {
    date: '2023-10-14',
    changes: [
      'Added custom events metadata feature.',
      'Reworked the plan usage section on the billing page.',
      'Reworked billing page, added a lot of new tiers',
      'Reworked auth pages.',
      'Added alerts for custom events.',
      'Rewritten and moved blog from a separate domain to the main domain.',
      'Fixed an issue which caused unclickable "Shared projects" tab on mobile devices for account that have no shared projects.',
      'Added Admin API.',
      'And a lot of other small improvements and fixes.',
    ],
  },
  {
    date: '2023-07-22',
    changes: [
      "Added 2 new periods: 'All time' and 'This hour'. The 'All time' period will show you the statistics for the whole period since you've created the project, and the 'This hour' period will show you the statistics for the last 60 minutes (with the 'minute' time bucket).",
      'Added the ability to track which region (or state) and city your users come from.',
      'Minor UX improvements by reordering the action buttons on the Project Dashboard page..',
      "Improved billing: When you upgrade or downgrade your plan, we now apply pro-rated charges. This means you'll only be charged for the time you use your plan, saving you money in the process.",
      'Added the ability to apply multiple filters to a column. For example, you can now narrow the statistics to show only the data for users from Germany, the UK and Ukraine.',
      "Lots of other general performance improvements, marketplace extensions (we've added a lot of new extensions recently, check them out. They are free.) and bug fixes.",
    ],
  },
  {
    date: '2023-06-17',
    changes: [
      'Fully migrated our frontend to Remix Framework (Server-side rendering), thus improving the performance of Swetrix. Also in the future you can expect A LOT of cool improvements like link image previews and so on.',
      "Now when you create a new Project - it's ID is generated on the server side.",
      "Hidden the 'New password' input fields under the 'Change password' spoiler on the Account settings page.",
      'Redesigned Header, Footer and the white theme - removed unnecessary blue colors and made it more consistent (there will be more UI improvements soon!).',
    ],
  },
  {
    date: '2023-05-29',
    changes: [
      'Added password protected Projects functionality: now you can set a password on your Dashboard and share it with other people, only those who know the password will be able to access it.',
    ],
  },
  {
    date: '2023-05-28',
    changes: [
      'Added an indicator that shows how many live visitors your Project has at the moment on the browser tab.',
      'Updated Swetrix logo.',
      'Hidden the "Hi! How can we help?" chat widget on all pages except the Contact page (yeah, it was a terrible idea to display it on ALL of the pages).',
    ],
  },
  {
    date: '2023-05-27',
    changes: [
      'Added Plan usage section to the Billing page.',
      "Added currency localisation: now you can pay for your plan with GBP (if you're located in the UK) or EUR (if you're located in Eurozone), for all other countries the default currency is still the US Dollar.",
    ],
  },
  {
    date: '2023-05-15',
    changes: [
      'Fixed timezone related issues.',
      "Dropped support for weekly timebucket - it's a pain to support it across multiple timezones, but we may add it back in the future.",
      'Fix a bug when filters might not be applied to the chart when reloading the page.',
    ],
  },
  {
    date: '2023-05-08',
    changes: [
      'Added an ability to compare statistics over time periods - now you can compare the current period with the previous one, or select a custom date range to compare.',
      <>
        Swetrix is now an Open Startup, we{' '}
        <Link to={routes.open} className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'>
          publish
        </Link>
        our finance and technical metrics.
      </>,
      'Refactored the statistics API: now the Dashboard loads at least 2 times faster and can easily handle dozens of millions of events.',
    ],
  },
  {
    date: '2023-04-27',
    changes: [
      'Added user flow feature. By using this functionality you can track user interactions and navigation patterns throughout your application, providing valuable insights for optimising user experience and engagement. To track user flow, you have to upgrade Swetrix NPM library to the version v2.2.1 or higher.',
      'Fully redesigned the Dashboard page, now your projects are listed as cards with a preview of the most important metrics.',
      'Updated the Project View screen to be more optimised for larger screens.',
      'Slightly improved the Dark theme throughout the application.',
    ],
  },
  {
    date: '2023-04-22',
    changes: ['Added an ability to partially delete project related analytics data.'],
  },
  {
    date: '2023-04-20',
    changes: ['Added sorting functinoality to the Custom events panel.'],
  },
  {
    date: '2023-04-18',
    changes: ['Added pagination for Custom events panel in Dashboard.'],
  },
  {
    date: '2023-04-17',
    changes: ['Added Github SSO support.'],
  },
  {
    date: '2023-04-16',
    changes: [
      'Added OAuth SSO: now you can sign in or register to Swetrix using your Google account or link a Google account to your existing Swetrix account to ease the sign in process. We will add other SSO providers soon :)',
    ],
  },
  {
    date: '2023-04-13',
    changes: ['Added an ability to view custom events on chart.'],
  },
  {
    date: '2023-04-12',
    changes: ['Fixed an issue when the selected time bucket or period was not remembered and used after page reload.'],
  },
  {
    date: '2023-04-09',
    changes: [
      'Added an ability to transfer a project from one account to another.',
      "Fixed a bug when the app was crashing due to 'ChunkLoadError: Loading chunk N failed' error. Now in case of such error the app will reload the page automatically for one time.",
      'Fixed broken alignment of the action buttons in the dashboard.',
    ],
  },
  {
    date: '2023-04-06',
    changes: [
      'utm_* parameters in the dashboard are now displayed as decoded URL values (i.e. %20 is replaced with a space, %3D is replaced with an equal sign, etc.).',
      'Fully rewritten the frontend part of Swetrix to TypeScript to improve stability and code quality.',
      'Fixed some minor bugs related to live visitors counter and the CAPTCHA configuration page.',
      'Fixed spacing between action buttons on Dashboard on mobile layouts.',
    ],
  },
  {
    date: '2023-03-20',
    changes: [
      <>
        Introducing a new service:{' '}
        <a
          href={CAPTCHA_URL}
          className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
          target='_blank'
          rel='noopener noreferrer'
        >
          Swetrix CAPTCHA
        </a>
        . This is a privacy-focused and fully opensource CAPTCHA service that you can use on your website to protect it
        from bots. Read more about it in our{' '}
        <a
          href={DOCS_CAPTCHA_URL}
          className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
          target='_blank'
          rel='noopener noreferrer'
        >
          documentation page
        </a>
        .
      </>,
    ],
  },
  {
    date: '2023-03-18',
    changes: [
      'Added new email report frequency: quarterly.',
      'Added project email reports subscription to multiple email addresses.',
    ],
  },
  {
    date: '2023-03-11',
    changes: [
      "Redesigned Dashboard page panel pages layout (now it's more user friendly, the total count of items and pages are displayed as well).",
    ],
  },
  {
    date: '2023-02-26',
    changes: ['Added a switch between line and bar chart on the dashboard page.'],
  },
  {
    date: '2023-02-18',
    changes: [
      'Added AI forecasting functionality.',
      'Migrated to a paid-only model with a free trial. Everyone who had signed up on Swetrix before that change can continue to use their free tier.',
    ],
  },
  {
    date: '2023-02-09',
    changes: [
      'Added an ability to filter data by custom events.',
      <>
        Released a public{' '}
        <a
          href={`${DOCS_URL}/statistics-api`}
          className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
          target='_blank'
          rel='noopener noreferrer'
        >
          API Documentation
        </a>{' '}
        related to data aggregation.
      </>,
      'Fully refactored the authentication system.',
      'Added support for API keys.',
    ],
  },
  {
    date: '2023-02-04',
    changes: [
      'Added a Polish translation.',
      <>
        Added a{' '}
        <Link to={routes.cookiePolicy} className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'>
          Cookie policy
        </Link>
        .
      </>,
    ],
  },
  {
    date: '2023-01-28',
    changes: [
      'Added time notation setting: now you can display chart hours in 12-hour or 24-hour format.',
      'Fixed live visitors dropdown overlap for non-English languages.',
    ],
  },
  {
    date: '2023-01-17',
    changes: [
      <>
        Got rid of our custom documentation page and migrated to Docusaurus insted. Check it out at{' '}
        <a
          href={DOCS_URL}
          className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
          target='_blank'
          rel='noopener noreferrer'
        >
          {DOCS_URL}
        </a>
        .
      </>,
    ],
  },
  {
    date: '2023-01-05',
    changes: [
      <>
        Added notification channels integrations. Now you can connect your Telegram account to our official bot and
        receive notifications (e.g. when someone logins into your account), set up custom project alerts and much more!
        You can set up the integration in your{' '}
        <Link to={INTEGRATIONS_LINK} className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'>
          account settings
        </Link>
        .
      </>,
      'Added new tab in Dashboard: Alerts.\nAutomated alerts are a powerful tool that allow you to run automated tasks when specific events occur.\nWe can automatically monitor your project for traffic spikes and notify you via Telegram.',
    ],
  },
  {
    date: '2023-01-03',
    changes: [
      "Added new tab in Dashboard: Performance. By switching to it you'll be able to see the performance of your website, page loading by country, some detailed statistics like TTFB, DOM Content Load, DNS response time and so on.\nTo collect the performance data you need to upgrade swetrix.js tracking script to v2.0.0 or higher.\nIf you're using the UMD build - the latest version is pulled automatically.\nIf you're using the NPM package - make sure to update it manually.",
    ],
  },
  {
    date: '2022-12-30',
    changes: [
      "Added an ability to see live visitors on your website. Now you're able to not only see how many visitors you have, but actually see some information about them.",
      "Added new metric: session duration. Now you're able to see how long your users are staying on your website.",
      'Added new chart metrics: bounce rate, views per session, trendlines and session duration.',
      <>
        Added the comparisons column to the footer. There&apos;s only{' '}
        <a
          href={SWETRIX_VS_GOOGLE}
          className='font-medium text-indigo-600 hover:underline dark:text-indigo-400'
          target='_blank'
          rel='noopener noreferrer'
          aria-label='Swetrix to Google Analytics comparison (opens in a new tab)'
        >
          Google Analytics comparison
        </a>{' '}
        for now, but more will be added soon.
      </>,
      'Improved chart colours.',
      'Launched the changelog page! 🎉',
    ],
  },
]

const Changelog = () => {
  const { t } = useTranslation('common')

  return (
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <div className='mx-auto px-4 pt-12 pb-16 whitespace-pre-line sm:px-6 md:w-4/5 lg:px-8'>
        <h1 className='text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50'>{t('titles.changelog')}</h1>

        <div className='relative mt-10 sm:ml-[calc(2rem+1px)] sm:pb-12 md:ml-[calc(3.5rem+1px)] lg:ml-[calc(11rem)]'>
          <div className='absolute top-3 right-full bottom-0 mr-7 hidden w-px bg-slate-200 sm:block md:mr-[3.25rem] dark:bg-slate-700' />
          <div className='space-y-16'>
            {_map(changelog, (item) => {
              const date = dayjs.utc(item.date).format('YYYY-MM-DDT00:00:00.000Z')
              const displayDate = dayjs.utc(item.date).locale('en').format('MMM DD, YYYY')

              return (
                <div key={item.date} className='group relative'>
                  <div className='absolute -inset-x-4 -inset-y-2.5 group-hover:bg-slate-50/70 sm:rounded-2xl md:-inset-x-6 md:-inset-y-4 dark:group-hover:bg-slate-800/50' />
                  <svg
                    viewBox='0 0 9 9'
                    className='absolute top-2 right-full mr-6 hidden h-[calc(0.5rem+1px)] w-[calc(0.5rem+1px)] overflow-visible text-slate-200 sm:block md:mr-12 dark:text-slate-600'
                  >
                    <circle
                      cx='4.5'
                      cy='4.5'
                      r='4.5'
                      stroke='currentColor'
                      className='fill-white dark:fill-slate-800'
                      strokeWidth={2}
                    />
                  </svg>
                  <div className='relative'>
                    <ul className='dark:prose-dark prose prose-slate prose-a:relative prose-a:z-10 relative top-7 mt-2 mb-4 list-disc text-base text-gray-900 lg:top-0 lg:block dark:text-gray-50'>
                      {_map(item.changes, (change) => (
                        // @ts-expect-error
                        <li key={change} className='whitespace-pre-line'>
                          {change}
                        </li>
                      ))}
                    </ul>
                    <dl className='absolute top-0 left-1.5 font-mono uppercase lg:right-full lg:left-auto lg:mr-[calc(5rem+1px)]'>
                      <dt className='sr-only'>Date</dt>
                      <dd className='text-sm leading-6 whitespace-nowrap text-slate-700 dark:text-slate-300'>
                        <time dateTime={date}>{displayDate}</time>
                      </dd>
                    </dl>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Changelog
