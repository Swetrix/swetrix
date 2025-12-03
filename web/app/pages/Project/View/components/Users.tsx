import { ChevronRightIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import _map from 'lodash/map'
import { FileTextIcon, MousePointerClickIcon, UserIcon, UsersIcon, CalendarIcon } from 'lucide-react'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'

import { Profile as ProfileType } from '~/lib/models/Project'
import Loader from '~/ui/Loader'

import CCRow from './CCRow'

dayjs.extend(relativeTime)

// Adjectives and nouns for generating anonymous display names
const ADJECTIVES = [
  'Amber',
  'Azure',
  'Beige',
  'Black',
  'Blue',
  'Bronze',
  'Brown',
  'Coral',
  'Crimson',
  'Cyan',
  'Emerald',
  'Fuchsia',
  'Gold',
  'Gray',
  'Green',
  'Indigo',
  'Ivory',
  'Jade',
  'Lavender',
  'Lime',
  'Magenta',
  'Maroon',
  'Mint',
  'Navy',
  'Olive',
  'Orange',
  'Peach',
  'Pink',
  'Plum',
  'Purple',
  'Red',
  'Rose',
  'Ruby',
  'Salmon',
  'Sapphire',
  'Scarlet',
  'Silver',
  'Slate',
  'Teal',
  'Turquoise',
  'Violet',
  'White',
  'Yellow',
]

const NOUNS = [
  'Albatross',
  'Ant',
  'Badger',
  'Bear',
  'Beaver',
  'Bison',
  'Butterfly',
  'Camel',
  'Cardinal',
  'Cat',
  'Cheetah',
  'Cobra',
  'Condor',
  'Coyote',
  'Crane',
  'Crow',
  'Deer',
  'Dolphin',
  'Dove',
  'Dragon',
  'Eagle',
  'Elephant',
  'Elk',
  'Falcon',
  'Ferret',
  'Finch',
  'Flamingo',
  'Fox',
  'Frog',
  'Gazelle',
  'Giraffe',
  'Goat',
  'Goose',
  'Gorilla',
  'Hamster',
  'Hare',
  'Hawk',
  'Hedgehog',
  'Heron',
  'Hippo',
  'Horse',
  'Hummingbird',
  'Hyena',
  'Iguana',
  'Jaguar',
  'Jay',
  'Kangaroo',
  'Koala',
  'Lemur',
  'Leopard',
  'Lion',
  'Llama',
  'Lobster',
  'Lynx',
  'Macaw',
  'Meerkat',
  'Mongoose',
  'Moose',
  'Moth',
  'Mouse',
  'Narwhal',
  'Newt',
  'Octopus',
  'Orca',
  'Ostrich',
  'Otter',
  'Owl',
  'Panda',
  'Panther',
  'Parrot',
  'Peacock',
  'Pelican',
  'Penguin',
  'Phoenix',
  'Pig',
  'Pigeon',
  'Piranha',
  'Pony',
  'Porcupine',
  'Puma',
  'Quail',
  'Rabbit',
  'Raccoon',
  'Raven',
  'Rhino',
  'Robin',
  'Salamander',
  'Salmon',
  'Seal',
  'Shark',
  'Sheep',
  'Sloth',
  'Snail',
  'Snake',
  'Sparrow',
  'Spider',
  'Squirrel',
  'Stork',
  'Swan',
  'Tiger',
  'Toucan',
  'Trout',
  'Turtle',
  'Viper',
  'Vulture',
  'Walrus',
  'Weasel',
  'Whale',
  'Wolf',
  'Wombat',
  'Woodpecker',
  'Yak',
  'Zebra',
]

// Generate a deterministic display name from profileId
const generateDisplayName = (profileId: string): string => {
  // Simple hash function
  let hash = 0
  for (let i = 0; i < profileId.length; i++) {
    const char = profileId.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  hash = Math.abs(hash)

  const adjIndex = hash % ADJECTIVES.length
  const nounIndex = Math.floor(hash / ADJECTIVES.length) % NOUNS.length

  return `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`
}

interface UsersProps {
  profiles: ProfileType[]
  timeFormat: '12-hour' | '24-hour'
}

interface UserRowProps {
  profile: ProfileType
  timeFormat: '12-hour' | '24-hour'
}

const Separator = () => (
  <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 flex-none fill-gray-400'>
    <circle cx={1} cy={1} r={1} />
  </svg>
)

const UserRow = ({ profile, timeFormat }: UserRowProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const location = useLocation()

  const displayName = useMemo(() => {
    if (profile.isIdentified) {
      // For identified users, extract the user ID from the profileId
      const userId = profile.profileId.replace('usr_', '')
      // If it's a short enough ID, show it directly
      if (userId.length <= 20) {
        return userId
      }
      // Otherwise truncate it
      return `${userId.substring(0, 17)}...`
    }
    return generateDisplayName(profile.profileId)
  }, [profile.profileId, profile.isIdentified])

  const lastSeenText = useMemo(() => {
    return dayjs(profile.lastSeen)
      .toDate()
      .toLocaleDateString(language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
      })
  }, [profile.lastSeen, language, timeFormat])

  const firstSeenText = useMemo(() => {
    return dayjs(profile.firstSeen).toDate().toLocaleDateString(language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }, [profile.firstSeen, language])

  const params = new URLSearchParams(location.search)
  params.set('profileId', profile.profileId)

  // Generate avatar background color from profileId
  const avatarColor = useMemo(() => {
    let hash = 0
    for (let i = 0; i < profile.profileId.length; i++) {
      hash = profile.profileId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 65%, 55%)`
  }, [profile.profileId])

  return (
    <Link to={{ search: params.toString() }}>
      <li className='relative mb-3 flex cursor-pointer justify-between gap-x-6 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 transition-colors hover:bg-gray-200/70 sm:px-6 dark:border-slate-800/25 dark:bg-slate-800/70 dark:hover:bg-slate-700/60'>
        <div className='flex min-w-0 gap-x-4'>
          {/* Avatar */}
          <div
            className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white'
            style={{ backgroundColor: avatarColor }}
          >
            {profile.isIdentified ? <UserIcon className='h-5 w-5' /> : displayName.charAt(0)}
          </div>

          <div className='min-w-0 flex-auto'>
            <p className='flex items-center text-sm leading-6 font-semibold text-gray-900 dark:text-gray-50'>
              <span className='truncate'>{displayName}</span>
              {profile.isIdentified ? (
                <span className='ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'>
                  {t('project.identified')}
                </span>
              ) : null}
            </p>
            <p className='mt-1 flex flex-wrap items-center gap-x-2 text-xs leading-5 text-gray-500 dark:text-gray-300'>
              <span className='flex'>
                {profile.cc ? <CCRow size={18} cc={profile.cc} language={language} /> : t('project.unknownCountry')}
              </span>
              <Separator />
              {profile.os || t('project.unknown')}
              <Separator />
              {profile.br || t('project.unknown')}
            </p>
            <p className='mt-2 flex text-xs leading-5 text-gray-500 sm:hidden dark:text-gray-300'>
              <span className='mr-2 flex items-center' title={t('project.sessions')}>
                <UsersIcon className='mr-1 size-4' strokeWidth={1.5} /> {profile.sessionsCount}
              </span>
              <span className='mr-2 flex items-center' title={t('dashboard.pageviews')}>
                <FileTextIcon className='mr-1 size-4' strokeWidth={1.5} /> {profile.pageviewsCount}
              </span>
              {profile.eventsCount > 0 ? (
                <span className='flex items-center' title={t('dashboard.events')}>
                  <MousePointerClickIcon className='mr-1 size-4' strokeWidth={1.5} /> {profile.eventsCount}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-x-4'>
          <div className='hidden sm:flex sm:flex-col sm:items-end'>
            <div className='flex items-center gap-x-3 text-sm leading-6 text-gray-900 dark:text-gray-50'>
              <span className='flex items-center' title={t('project.xSessions', { x: profile.sessionsCount })}>
                <UsersIcon className='mr-1 size-5' strokeWidth={1.5} /> {profile.sessionsCount}
              </span>
              <span className='flex items-center' title={t('dashboard.xPageviews', { x: profile.pageviewsCount })}>
                <FileTextIcon className='mr-1 size-5' strokeWidth={1.5} /> {profile.pageviewsCount}
              </span>
              {profile.eventsCount > 0 ? (
                <span className='flex items-center' title={t('dashboard.xCustomEvents', { x: profile.eventsCount })}>
                  <MousePointerClickIcon className='mr-1 size-5' strokeWidth={1.5} /> {profile.eventsCount}
                </span>
              ) : null}
            </div>
            <p className='mt-1 flex items-center text-xs leading-5 text-gray-500 dark:text-gray-400'>
              <CalendarIcon className='mr-1 size-3' strokeWidth={1.5} />
              {lastSeenText}
            </p>
          </div>
          <ChevronRightIcon className='h-5 w-5 flex-none text-gray-400' aria-hidden='true' />
        </div>
      </li>
    </Link>
  )
}

interface UsersFilterProps {
  profileType: 'all' | 'anonymous' | 'identified'
  onProfileTypeChange: (type: 'all' | 'anonymous' | 'identified') => void
  search: string
  onSearchChange: (search: string) => void
}

export const UsersFilter: React.FC<UsersFilterProps> = ({
  profileType,
  onProfileTypeChange,
  search,
  onSearchChange,
}) => {
  const { t } = useTranslation('common')

  return (
    <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={() => onProfileTypeChange('all')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            profileType === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
          }`}
        >
          {t('project.allUsers')}
        </button>
        <button
          type='button'
          onClick={() => onProfileTypeChange('anonymous')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            profileType === 'anonymous'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
          }`}
        >
          {t('project.anonymous')}
        </button>
        <button
          type='button'
          onClick={() => onProfileTypeChange('identified')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            profileType === 'identified'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
          }`}
        >
          {t('project.identified')}
        </button>
      </div>
      <div className='relative'>
        <input
          type='text'
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('project.searchUsers')}
          className='block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:w-64 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:placeholder-gray-400'
        />
      </div>
    </div>
  )
}

export const Users: React.FC<UsersProps> = ({ profiles, timeFormat }) => {
  return (
    <ClientOnly
      fallback={
        <div className='bg-gray-50 dark:bg-slate-900'>
          <Loader />
        </div>
      }
    >
      {() => (
        <ul className='mt-4'>
          {_map(profiles, (profile) => (
            <UserRow key={profile.profileId} profile={profile} timeFormat={timeFormat} />
          ))}
        </ul>
      )}
    </ClientOnly>
  )
}
