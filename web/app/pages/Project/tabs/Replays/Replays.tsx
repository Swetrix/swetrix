import cx from 'clsx'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import _map from 'lodash/map'
import {
  CaretRightIcon,
  CursorClickIcon,
  FileTextIcon,
  ListBulletsIcon,
  TrashIcon,
  UserIcon,
  VideoCameraIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import type { SessionReplayListItem } from '~/api/api.server'
import { Badge } from '~/ui/Badge'
import Flag from '~/ui/Flag'
import Button from '~/ui/Button'
import { Link } from '~/ui/Link'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { BrowserIcon, OSIcon } from '~/pages/Project/tabs/SharedIcons'
import { PROJECT_TABS } from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'
import { getStringFromTime, getTimeFromSeconds } from '~/utils/generic'
import countries from '~/utils/isoCountries'
import { getProfileDisplayName, ProfileAvatar } from '~/utils/profileAvatars'

dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.extend(utc)

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
}

const getCurrencySymbol = (currency?: string) =>
  CURRENCY_SYMBOLS[currency || 'USD'] || CURRENCY_SYMBOLS.USD

interface ReplaysProps {
  replays: SessionReplayListItem[]
  timeFormat: '12-hour' | '24-hour'
  timezone: string
  currency?: string
  onDeleteReplay?: (replay: SessionReplayListItem) => void
  deletingReplayKey?: string | null
}

interface ReplayRowProps extends Omit<ReplaysProps, 'replays'> {
  replay: SessionReplayListItem
}

const formatDate = (
  value: string | null | undefined,
  language: string,
  timeFormat: '12-hour' | '24-hour',
  timezone: string,
) => {
  if (!value) return null

  const date = dayjs.utc(value)
  if (!date.isValid()) return null

  return date.toDate().toLocaleDateString(language, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: timeFormat === '12-hour' ? 'h12' : 'h23',
    timeZone: timezone,
  })
}

const ReplayRow = ({
  replay,
  timeFormat,
  timezone,
  currency,
  onDeleteReplay,
  deletingReplayKey,
}: ReplayRowProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const location = useLocation()
  const { theme } = useTheme()
  const currencySymbol = getCurrencySymbol(currency)
  const replayKey = `${replay.psid}:${replay.replayId}`
  const isDeleting = deletingReplayKey === replayKey

  const displayName = useMemo(() => {
    if (!replay.profileId) {
      return t('project.unknownUser')
    }

    return getProfileDisplayName(replay.profileId, Boolean(replay.isIdentified))
  }, [replay.profileId, replay.isIdentified, t])

  const replayStartedAt = useMemo(
    () =>
      formatDate(
        replay.replayStart || replay.replayCreatedAt,
        language,
        timeFormat,
        timezone,
      ),
    [
      language,
      replay.replayCreatedAt,
      replay.replayStart,
      timeFormat,
      timezone,
    ],
  )
  const replayExpiresAt = useMemo(
    () => formatDate(replay.replayExpiresAt, language, timeFormat, timezone),
    [language, replay.replayExpiresAt, timeFormat, timezone],
  )
  const durationString = useMemo(() => {
    if (!replay.replayDuration || replay.replayDuration <= 0) return null
    return getStringFromTime(getTimeFromSeconds(replay.replayDuration))
  }, [replay.replayDuration])
  const dateLineString = useMemo(() => {
    if (!replayStartedAt) return durationString

    const durationDisplay = durationString ? ` • ${durationString}` : ''

    return (
      <span className='flex items-center'>
        {replayStartedAt}
        {durationDisplay}
      </span>
    )
  }, [durationString, replayStartedAt])

  const replayParams = new URLSearchParams(location.search)
  replayParams.set('tab', PROJECT_TABS.replays)
  replayParams.set('psid', replay.psid)
  replayParams.set('replayId', replay.replayId)
  replayParams.delete('profileId')

  const sessionParams = new URLSearchParams(location.search)
  sessionParams.set('tab', PROJECT_TABS.sessions)
  sessionParams.set('psid', replay.psid)
  sessionParams.delete('profileId')
  sessionParams.delete('replayId')

  const profileParams = new URLSearchParams(location.search)
  profileParams.set('tab', PROJECT_TABS.profiles)
  if (replay.profileId) {
    profileParams.set('profileId', replay.profileId)
  }
  profileParams.delete('psid')
  profileParams.delete('replayId')

  return (
    <li className='mb-2'>
      <div className='relative flex items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:bg-gray-200/70 dark:border-slate-800/60 dark:bg-slate-900/25 dark:hover:bg-slate-900/60'>
        <Link
          to={{ search: replayParams.toString() }}
          className='flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-x-4 rounded-lg px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-inset sm:px-5 dark:focus-visible:ring-slate-300'
        >
          <div className='flex min-w-0 flex-1 items-center gap-x-3.5'>
            <div className='relative shrink-0'>
              {replay.profileId ? (
                <ProfileAvatar profileId={replay.profileId} size={32} />
              ) : (
                <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200/50 dark:bg-slate-800 dark:ring-slate-700/50'>
                  <Text size='xs' weight='medium' colour='secondary'>
                    ?
                  </Text>
                </div>
              )}
            </div>

            <div className='flex min-w-0 flex-1 flex-col justify-center gap-2'>
              <div className='flex flex-wrap items-start justify-between gap-2 sm:gap-4'>
                <div className='flex min-w-0 items-center gap-2'>
                  <Text size='sm' weight='semibold' truncate>
                    {displayName}
                  </Text>
                  {Boolean(replay.isIdentified) && (
                    <Badge
                      label={t('project.identified')}
                      colour='indigo'
                      className='text-[0.625rem] leading-3'
                    />
                  )}
                </div>

                <div className='mt-0.5 flex shrink-0 items-center sm:hidden'>
                  <Text size='xs' colour='secondary' className='text-[11px]'>
                    {dateLineString}
                  </Text>
                </div>
              </div>

              <div className='flex items-center justify-between gap-4'>
                <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
                  <div className='flex items-center gap-1.5'>
                    <Tooltip
                      text={
                        replay.cc
                          ? countries.getName(replay.cc, language) || replay.cc
                          : t('project.unknownCountry')
                      }
                      tooltipNode={
                        <div className='flex h-[22px] w-[22px] items-center justify-center rounded bg-gray-100/80 ring-1 ring-gray-200/50 dark:bg-slate-800/80 dark:ring-slate-700/50'>
                          <Flag
                            country={replay.cc}
                            size={14}
                            className='rounded-[2px]'
                            aria-hidden='true'
                          />
                        </div>
                      }
                    />
                    <Tooltip
                      text={replay.os || t('project.unknown')}
                      tooltipNode={
                        <div className='flex h-[22px] w-[22px] items-center justify-center rounded bg-gray-100/80 ring-1 ring-gray-200/50 dark:bg-slate-800/80 dark:ring-slate-700/50'>
                          <OSIcon
                            os={replay.os}
                            theme={theme}
                            className='size-3.5'
                          />
                        </div>
                      }
                    />
                    <Tooltip
                      text={replay.br || t('project.unknown')}
                      tooltipNode={
                        <div className='flex h-[22px] w-[22px] items-center justify-center rounded bg-gray-100/80 ring-1 ring-gray-200/50 dark:bg-slate-800/80 dark:ring-slate-700/50'>
                          <BrowserIcon
                            browser={replay.br}
                            className='size-3.5'
                          />
                        </div>
                      }
                    />
                  </div>

                  <div className='h-3 w-px bg-gray-200 dark:bg-slate-700' />

                  <div className='flex items-center gap-3'>
                    <Tooltip
                      text={t('project.sessionReplay.eventsCount', {
                        count: replay.eventCount,
                      })}
                      tooltipNode={
                        <Text
                          as='span'
                          size='xs'
                          colour='secondary'
                          weight='medium'
                          className='flex items-center gap-1'
                        >
                          <VideoCameraIcon className='size-3.5' />
                          {replay.eventCount}
                        </Text>
                      }
                    />

                    <Tooltip
                      text={t('dashboard.pageviews')}
                      tooltipNode={
                        <Text
                          as='span'
                          size='xs'
                          colour='secondary'
                          weight='medium'
                          className='flex items-center gap-1'
                        >
                          <FileTextIcon className='size-3.5' />
                          {replay.pageviews}
                        </Text>
                      }
                    />

                    {replay.customEvents > 0 ? (
                      <Tooltip
                        text={t('dashboard.events')}
                        tooltipNode={
                          <Text
                            as='span'
                            size='xs'
                            colour='secondary'
                            weight='medium'
                            className='flex items-center gap-1'
                          >
                            <CursorClickIcon className='size-3.5' />
                            {replay.customEvents}
                          </Text>
                        }
                      />
                    ) : null}

                    {replay.revenue != null && replay.revenue !== 0 ? (
                      <Tooltip
                        text={t('dashboard.revenue')}
                        tooltipNode={
                          <Text
                            as='span'
                            size='xs'
                            weight='medium'
                            colour='inherit'
                            className={cx('flex items-center gap-1', {
                              'text-emerald-600 dark:text-emerald-500':
                                replay.revenue > 0,
                              'text-amber-600 dark:text-amber-500':
                                replay.revenue < 0,
                            })}
                          >
                            {replay.revenue < 0 ? '-' : ''}
                            {currencySymbol}
                            {Math.abs(replay.revenue).toFixed(2)}
                          </Text>
                        }
                      />
                    ) : null}

                    {replay.errors > 0 ? (
                      <Tooltip
                        text={t('dashboard.errors')}
                        tooltipNode={
                          <Text
                            as='span'
                            size='xs'
                            colour='error'
                            weight='medium'
                            className='flex items-center gap-1'
                          >
                            <WarningIcon className='size-3.5' />
                            {replay.errors}
                          </Text>
                        }
                      />
                    ) : null}
                  </div>

                  {replayExpiresAt ? (
                    <>
                      <div className='hidden h-3 w-px bg-gray-200 sm:block dark:bg-slate-700' />
                      <Text
                        as='span'
                        size='xs'
                        colour='secondary'
                        className='hidden sm:inline'
                      >
                        {t('project.sessionReplay.expiresAt', {
                          date: replayExpiresAt,
                        })}
                      </Text>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className='hidden shrink-0 items-center gap-x-3 sm:flex'>
            <div className='flex flex-col items-end'>
              <Text as='p' size='xs' colour='secondary' className='text-[11px]'>
                {dateLineString}
              </Text>
            </div>
            <CaretRightIcon
              className='size-4 text-gray-400'
              aria-hidden='true'
            />
          </div>
          <div className='flex shrink-0 items-center sm:hidden'>
            <CaretRightIcon
              className='size-4 text-gray-400'
              aria-hidden='true'
            />
          </div>
        </Link>

        <div className='hidden shrink-0 items-center gap-x-2 pr-3 sm:flex'>
          <Tooltip
            text={t('project.viewSession')}
            tooltipNode={
              <Button
                variant='icon'
                aria-label={t('project.viewSession')}
                to={{ search: sessionParams.toString() }}
              >
                <ListBulletsIcon className='size-4' />
              </Button>
            }
          />
          {replay.profileId ? (
            <Tooltip
              text={t('project.goToProfile')}
              tooltipNode={
                <Button
                  variant='icon'
                  aria-label={t('project.goToProfile')}
                  to={{ search: profileParams.toString() }}
                >
                  <UserIcon className='size-4' />
                </Button>
              }
            />
          ) : null}
          {onDeleteReplay ? (
            <Tooltip
              text={t('project.sessionReplay.delete')}
              tooltipNode={
                <Button
                  variant='icon'
                  aria-label={t('project.sessionReplay.delete')}
                  disabled={isDeleting}
                  onClick={() => onDeleteReplay(replay)}
                >
                  <TrashIcon className='size-4' />
                </Button>
              }
            />
          ) : null}
        </div>

        <div className='flex shrink-0 items-center gap-1 pr-2 sm:hidden'>
          <Button
            variant='icon'
            aria-label={t('project.viewSession')}
            to={{ search: sessionParams.toString() }}
          >
            <ListBulletsIcon className='size-4' />
          </Button>
          {onDeleteReplay ? (
            <Button
              variant='icon'
              aria-label={t('project.sessionReplay.delete')}
              disabled={isDeleting}
              onClick={() => onDeleteReplay(replay)}
            >
              <TrashIcon className='size-4' />
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  )
}

export const Replays = ({
  replays,
  timeFormat,
  timezone,
  currency,
  onDeleteReplay,
  deletingReplayKey,
}: ReplaysProps) => {
  return (
    <ul className='flex flex-col'>
      {_map(replays, (replay) => (
        <ReplayRow
          key={`${replay.psid}:${replay.replayId}`}
          replay={replay}
          timeFormat={timeFormat}
          timezone={timezone}
          currency={currency}
          onDeleteReplay={onDeleteReplay}
          deletingReplayKey={deletingReplayKey}
        />
      ))}
    </ul>
  )
}
