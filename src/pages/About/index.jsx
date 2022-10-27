/* eslint-disable */
import React from 'react'
import _map from 'lodash/map'

import { CONTACT_EMAIL, GITHUB_URL } from 'redux/constants'
import Title from 'components/Title'

const socialIcons = {
  LinkedIn: (
    <img className='h-6 w-6 opacity-75 hover:opacity-90 bg-white rounded' aria-hidden='true' src='/assets/linkedin.svg' alt='' />
  ),
  Github: (
    <svg className='h-6 w-6' fill='currentColor' viewBox='0 0 24 24'>
      <path
        d='M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z'
        fillRule='evenodd'
        clipRule='evenodd'
      />
    </svg>
  ),
}

const Teammate = ({
  photo, name, role, socials, desc,
}) => (
  <div className='flex flex-col lg:flex-row mt-6'>
    <img alt='' src={photo} className='rounded-xl shadow-lg w-80' />
    <div className='ml-0 lg:ml-2'>
      <p className='text-3xl mt-2 lg:mt-0 font-bold text-gray-900 dark:text-gray-50 tracking-tight'>
        {name}
      </p>
      <p className='text-xl text-gray-900 dark:text-gray-50 tracking-tight'>
        {role}
      </p>
      <div className='flex space-x-4 mt-2'>
        {_map(socials, (value, key) => (
          <a key={value} href={value} title={key} target='_blank' rel='noopener noreferrer' className='text-gray-400 hover:text-gray-300'>
            <span className='sr-only'>{key}</span>
            {socialIcons[key]}
          </a>
        ))}
      </div>
      <p className='mt-2 lg:mt-5 text-lg whitespace-pre-line text-gray-900 dark:text-gray-50 tracking-tight'>
        {desc}
      </p>
    </div>
  </div>
)

const team = [
  {
    name: '🇺🇦 Andrii Romasiun',
    role: 'Founder; Product Developer.',
    photo: '/assets/andrii.jpg',
    desc: 'Works on Swetrix frontend and backend side.\nPartially marketing and product management.',
    socials: {
      LinkedIn: 'https://www.linkedin.com/in/andriir/',
      Github: 'https://github.com/Blaumaus',
    },
  },
  {
    name: '🇺🇦 Yehor Dremliuha',
    role: 'Co-Founder; Software Engineer.',
    photo: '/assets/yehor.jpg',
    desc: 'A great person.\nEnglish tutor, Python developer.\nWorks on Swetrix Python integrations, blog and anything related to the backend.',
    socials: {
      LinkedIn: 'https://www.linkedin.com/in/yehor-dremliuha-0b6161212/',
      Github: 'https://github.com/pro1code1hack',
    },
  },
  {
    name: '🇺🇦 Maxim Mrug',
    role: 'Co-Founder; Frontend Engineer.',
    photo: '/assets/maxim.jpg',
    desc: 'A great frontend developer.\nKnows JavaScript like his native language.',
    socials: {
      LinkedIn: 'https://www.linkedin.com/in/maksim-mrug-047b52235/',
      Github: 'https://github.com/kruzhambus',
    },
  },
  {
    name: '🇷🇺 Ivan Kolesov',
    role: 'Software Engineer; Data Scientist.',
    photo: '/assets/ivan.jpg',
    desc: 'Works on Swetrix Telegram integrations and Analytics logic.',
    socials: {
      Github: 'https://github.com/ivan1kolesov',
    },
  },
  {
    name: '🇺🇦 Yevhenii Kulisidi',
    role: 'Co-Founder; Backend Developer.',
    photo: '/assets/yevhenii.jpg',
    desc: 'Works on Swetrix API and Swetrix Marketplace.',
    socials: {
      Github: 'https://github.com/rhaxma',
    },
  },
]

const About = () => (
  <Title title='About us'>
    <div className='bg-gray-50 dark:bg-gray-800 min-h-min-footer'>
      <div className='max-w-prose md:max-w-none md:w-8/12 mx-auto pb-16 pt-12 px-4 sm:px-6 lg:px-8 whitespace-pre-line'>
        <h1 className='text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight'>
          About us
        </h1>
        <p className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          Swetrix was launched in August 2021 as a project that focuses on user privacy and transparency, while at the same time offering the same functionality as competitors like Google Analytics.
          <br />
          Swetrix is completely&nbsp;
          <a href={GITHUB_URL} className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500' target='_blank' rel='noopener noreferrer'>
            open source
          </a>
          , we don't use cookies to track users so you can forget about cookie banners using our service.
          <br />
          We will not and will never sell, abuse, share or otherwise negatively manipulate your data. Our priority is simplicity and transparency.
        </p>

        <h2 className='text-3xl mt-4 font-bold text-gray-900 dark:text-gray-50 tracking-tight'>
          Meet our team
        </h2>

        {_map(team, (el) => (
          <Teammate key={el.name} {...el} />
        ))}

        <hr className='mt-10 border-gray-200 dark:border-gray-600' />
        <p className='mt-2 text-lg text-gray-900 dark:text-gray-50 tracking-tight'>
          If you have read this far, why not&nbsp;
          <a href={`mailto:${CONTACT_EMAIL}`} className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'>
            reach out to us?
          </a>
          &nbsp;We would be happy to hear feedback, criticism or suggestions from you!
        </p>
      </div>
    </div>
  </Title>
)

export default About
