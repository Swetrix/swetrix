import React from 'react'
import _map from 'lodash/map'

import { CONTACT_EMAIL, GITHUB_URL } from '~/lib/constants'
import { SiGithub, SiLinkedin, SiX } from '@icons-pack/react-simple-icons'

const socialIcons: {
  [key: string]: React.ReactNode
} = {
  LinkedIn: <SiLinkedin className='h-6 w-6' />,
  Github: <SiGithub className='h-6 w-6' />,
  Twitter: <SiX className='h-6 w-6' />,
}

interface TeammateProps {
  photo: string
  name: string
  role: string
  socials: {
    [key: string]: string
  }
  desc: string
}

const Teammate = ({ photo, name, role, socials, desc }: TeammateProps) => (
  <div className='flex flex-col py-6 md:flex-row md:gap-x-8'>
    <div className='flex justify-center md:w-2/5'>
      <img
        alt={name}
        src={photo}
        className='size-80 rounded-full border border-gray-200 object-cover dark:border-slate-800/50'
        style={{ aspectRatio: '1 / 1' }}
      />
    </div>
    <div className='mt-5 mb-4 text-center font-mono md:mt-0 md:mb-0 md:w-3/5 md:text-start'>
      <p className='mt-2 text-3xl font-bold tracking-tight text-gray-900 lg:mt-0 dark:text-gray-50'>{name}</p>
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
      <p className='mt-2 text-lg tracking-tight whitespace-pre-line text-gray-900 lg:mt-5 dark:text-gray-50'>{desc}</p>
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
] as const

const About = () => (
  <div>
    <div className='min-h-min-footer bg-gray-50 dark:bg-slate-900'>
      <div className='mx-auto max-w-7xl px-4 pt-12 pb-16 whitespace-pre-line sm:px-6 lg:px-8'>
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

        <div className='divide-y divide-gray-300/80 dark:divide-slate-500/50'>
          {_map(team, (el) => (
            <Teammate key={el.name} {...el} />
          ))}
        </div>

        <hr className='mt-10 border-gray-200 dark:border-gray-600' />
        <p className='mt-2 font-mono text-lg tracking-tight text-gray-900 dark:text-gray-50'>
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
