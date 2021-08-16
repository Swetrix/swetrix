import React, { memo, Fragment, useEffect } from 'react'
import _map from 'lodash/map'
import Prism from 'prismjs'

import Title from 'components/Title'
import Code from 'ui/Code'
import {
  umdBuildExample, trackPageView, init, track, trackExample,
} from './examples'

const contents = [{
  name: 'Getting Started',
  id: 'docs-gs',
  content: [{
    name: 'UMD Build',
    id: 'docs-umd',
  }]
}, {
  name: 'How to..',
  id: 'docs-ht',
  content: [{
    name: 'Track pageviews',
    id: 'docs-pv',
  }, {
    name: 'Track custom events',
    id: 'docs-ce',
  }]
}, {
  name: 'API',
  id: 'docs-api',
  content: [{
    name: 'init',
    id: 'docs-init',
  }, {
    name: 'track',
    id: 'docs-tr',
  }, {
    name: 'trackViews',
    id: 'docs-tv',
  }]
}]

const Contents = () => (
  <div className='lg:flex flex-1 items-start justify-center lg:order-2'>
    <h2 className='block lg:hidden text-3xl font-bold text-gray-900 tracking-tight'>Contents:</h2>
    <ol className='mb-10 lg:mb-0 lg:sticky lg:top-10'>
      {_map(contents, ({ name, id, content }) => (
        <Fragment key={id}>
          <li className='mt-3'>
            <a className='hover:underline text-2xl text-blue-600 font-bold' href={`#${id}`}>{name}</a>
          </li>
          <ol>
            {_map(content, ({ name: cname, id: cid }) => (
              <li key={cid}>
                <a className='hover:underline text-lg text-blue-500 px-4' href={`#${cid}`}>{cname}</a>
              </li>
            ))}
          </ol>
        </Fragment>
      ))}
    </ol>
  </div>
)

const CHeader = ({ id, name, addHr = true }) => (
  <>
    {addHr && (
      <hr className='mt-10' />
    )}
    <h2 id={id} className='text-3xl font-bold text-gray-900 tracking-tight mt-2'>{name}</h2>
  </>
)

const CSection = ({ id, name }) => (
  <h3 id={id} className='text-2xl font-normal text-gray-900 tracking-tight mt-3'>{name}</h3>
)

const Docs = () => {
  useEffect(() => {
    Prism.highlightAll()
  }, [])

  return (
    <Title title='Docs'>
      <div className='bg-gray-50'>
        <div className='w-11/12 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:w-11/12 lg:px-8 lg:flex'>
          <Contents />
          <div className='flex-1 lg:order-1'>
            <h1 className='text-4xl font-extrabold text-gray-900 tracking-tight'>Documentation</h1>

            <CHeader id='docs-gs' name='Getting Started' addHr={false} />
            <CSection id='docs-umd' name='UMD Build' />
            <Code text={umdBuildExample} language='html' />

            <CHeader id='docs-ht' name='How to..' />
            <CSection id='docs-pv' name='Track pageviews' />
            <p className='text-lg text-gray-900 tracking-tight'>
              Swetrix.js tracking script provides a way to collect a page view event once the page has loaded.<br />
              This can be accomplished via calling the <span className='font-bold'>trackViews()</span> function:<br />
            </p>
            <Code text={trackPageView} language='javascript' />

            <CSection id='docs-ce' name='Track custom events' />
            <p className='text-lg text-gray-900 tracking-tight'>
              In addition to tracking pageviews we provide an ability to track custom events. <br />
              For example, if you want to track an event like 'Sign up' or 'Newsletter subscription', this feature would be very useful.<br />
              Under the screen, the principle of this function is similar to trackViews.
            </p>
            <Code text={trackExample} language='javascript' />

            <CHeader id='docs-api' name='API' />

            <CSection id='docs-init' name='init' />
            <p className='text-lg text-gray-900 tracking-tight'>
              This fuction is used to initialise the analytics.<br />
              Basically you're letting the script know which project do you want to use it with, as well as specifying your custom parameters if needed.
            </p>
            <Code text={init} language='javascript' />

            <CSection id='docs-tr' name='track' />
            <p className='text-lg text-gray-900 tracking-tight'>
              With this function you are able to track any custom events you want.<br />
              You should never send any identifiable data (like User ID, email, session cookie, etc.) as an event name.
            </p>
            <Code text={track} language='javascript' />

            <CSection id='docs-tv' name='trackViews' />
            <p className='text-lg text-gray-900 tracking-tight'>
              Calling trackViews will result in sending the data about the user to our servers.<br />
              Such data will include the next params if available:<br />
              <div className='mb-5'>
                <ul className='ml-10'>
                  <li><b>pid</b> - the unique Project ID request is related to.</li>
                  <li><b>lc</b> - users locale (e.g. en_US or uk_UA).</li>
                  <li><b>tz</b> - users timezone (e.g. Europe/Helsinki).</li>
                  <li><b>ref</b> - the URL of the previous webpage from which a page was opened.</li>
                  <li><b>so</b> - the page source ('ref' | 'source' | 'utm_source' GET param).</li>
                  <li><b>me</b> - UTM medium ('utm_medium' GET param).</li>
                  <li><b>ca</b> - UTM campaign ('utm_campaign' GET param).</li>
                  <li><b>pg</b> - the page user currently views (e.g. /hello)</li>
                </ul>
              </div>
              On the server side we also gather users IP Address and User Agent.<br />
              This data is used to detect whether the page view is unique or not.<br />
              <b>We DO NOT store neither IP Address nor User Agent as a raw strings</b>, such data is stored as a salted hash for no longer than 30 minutes or 12:00 AM UTC, whatever happens first.<br />
              After this timeframe the identifiable data is forever deleted from our servers.
            </p>
            <Code text={trackPageView} language='javascript' />
          </div>
        </div>
      </div>
    </Title>
  )
}

export default memo(Docs)
