/* eslint-disable */
import React from 'react'
import _map from 'lodash/map'

import { CONTACT_EMAIL, GITHUB_URL } from 'redux/constants'

const socialIcons: {
  [key: string]: JSX.Element
} = {
  LinkedIn: (
    <img
      className='h-6 w-6 rounded bg-white opacity-75 hover:opacity-90'
      aria-hidden='true'
      src='/assets/linkedin.svg'
      alt='LinkedIn'
    />
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
  Twitter: (
    <svg className='h-6 w-6' fill='currentColor' viewBox='0 0 24 24'>
      <path
        d='M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84'
        fillRule='evenodd'
        clipRule='evenodd'
      />
    </svg>
  ),
}

interface ITeammate {
  photo: string
  name: string
  role: string
  socials: {
    [key: string]: string
  }
  desc: string
}

const Teammate = ({ photo, name, role, socials, desc }: ITeammate): JSX.Element => (
  <div className='flex flex-col py-6 md:flex-row md:gap-x-8'>
    <div className='flex justify-center md:w-2/5'>
      <img
        alt={name}
        src={photo}
        className='size-80 rounded-full object-cover shadow-lg'
        style={{ aspectRatio: '1 / 1' }}
      />
    </div>
    <div className='mb-4 mt-5 text-center md:mb-0 md:mt-0 md:w-3/5 md:text-start'>
      <p className='mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 lg:mt-0'>{name}</p>
      <p className='text-xl tracking-tight text-gray-900 dark:text-gray-50'>{role}</p>
      <div className='mt-2 flex justify-center space-x-4 md:justify-start'>
        {_map(socials, (value, key) => (
          <a
            key={value}
            href={value}
            title={key}
            target='_blank'
            rel='noopener noreferrer'
            className='text-gray-400 hover:text-gray-300'
            aria-label={`${key} (opens in a new tab)`}
          >
            <span className='sr-only'>{key}</span>
            {socialIcons[key]}
          </a>
        ))}
      </div>
      <p className='mt-2 whitespace-pre-line text-lg tracking-tight text-gray-900 dark:text-gray-50 lg:mt-5'>{desc}</p>
    </div>
  </div>
)

const team = [
  {
    name: 'Andrii Romasiun',
    role: 'Founder; Product Developer.',
    photo: '/assets/team/andrii.png',
    desc: "I've been interested in programming, tech and business for a long time and have developed many projects, from small open source tools to large enterprise applications.\n\nI founded Swetrix in 2021 and have been working on it since then. I've developed most of our major features, like performance monitoring, error tracking, sessions analysis and the marketplace.",
    socials: {
      LinkedIn: 'https://www.linkedin.com/in/andriir/',
      Twitter: 'https://twitter.com/blaumaus_',
      Github: 'https://github.com/Blaumaus',
    },
  },
  {
    name: 'Yehor Dremliuha',
    role: 'Co-Founder; Software Engineer.',
    photo: '/assets/team/yehor.png',
    desc: "I am a software engineer with a passion for creating high quality software. I'm a big fan of IT, cybersecurity and AI and have developed many projects in this field.\n\nI'm working on Swetrix integrations, AI and backend services and I'm responsible for a lot of different business tasks. I'm also the creator of 'Your Journey To Fluent Python' - an innovative book to learn programming in Python.",
    socials: {
      LinkedIn: 'https://www.linkedin.com/in/yehor-dremliuha-0b6161212/',
      Github: 'https://github.com/pro1code1hack',
    },
  },
  {
    name: 'Maxim Mrug',
    role: 'Co-Founder; Frontend Engineer.',
    photo: '/assets/team/max.png',
    desc: "At Swetrix my main focus is frontend development and I've been working with it for years. I started my journey with Vue and have tried many frameworks since then, now I mainly work with React and at Swetrix with Remix.",
    socials: {
      LinkedIn: 'https://www.linkedin.com/in/maksim-mrug-047b52235/',
      Github: 'https://github.com/kruzhambus',
    },
  },
  {
    name: 'Yevhenii Kulisidi',
    role: 'Lead Backend Developer.',
    photo: '/assets/team/yevhenii.png',
    desc: 'I am a backend engineer specialising in Node.js and TypeScript. I mainly work on the Swetrix API, focusing on its scalability, efficiency and integration.',
    socials: {
      LinkedIn: 'https://www.linkedin.com/in/kulisidi/',
      Github: 'https://github.com/yevheniikulisidi',
    },
  },
] as const

const About = (): JSX.Element => (
  <div>
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <div className='mx-auto max-w-7xl whitespace-pre-line px-4 pb-16 pt-12 sm:px-6 lg:px-8'>
        <h1 className='text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50'>
          We're changing the way web analytics is done
        </h1>
        <p className='mt-2 text-lg tracking-tight text-gray-900 dark:text-gray-50'>
          Swetrix was launched in August 2021 as a project that focuses on user privacy and transparency, while at the
          same time offering the same functionality as competitors like Google Analytics.
          <br />
          Swetrix is completely&nbsp;
          <a
            href={GITHUB_URL}
            className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
            target='_blank'
            rel='noopener noreferrer'
            aria-label='Source code (opens in a new tab)'
          >
            open source
          </a>
          , we don't use cookies to track users so you can forget about cookie banners using our service.
          <br />
          We have grown a lot since our initial launch, building a loyal community of people who love privacy-first web
          analytics, and building the product itself by making it the most feature-rich and innovative on the market.
          <br />
          We will never sell, misuse, share or otherwise negatively manipulate your data. Our priority is simplicity and
          transparency.
        </p>

        <h2 className='mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50'>Meet our team</h2>

        <div className='divide-y divide-gray-300/80'>
          {_map(team, (el) => (
            <Teammate key={el.name} {...el} />
          ))}
        </div>

        <hr className='mt-10 border-gray-200 dark:border-gray-600' />
        <p className='mt-2 text-lg tracking-tight text-gray-900 dark:text-gray-50'>
          If you have read this far, why not&nbsp;
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className='text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-500'
          >
            reach out to us?
          </a>
          &nbsp;We would be happy to hear feedback, criticism or suggestions from you!
        </p>
      </div>
    </div>
  </div>
)

export default About
