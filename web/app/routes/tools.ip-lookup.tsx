import {
  ArrowSquareOutIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react'
import { useState, useEffect, useMemo } from 'react'
import type { MetaFunction } from 'react-router'
import { redirect, useFetcher, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import { ClientOnly } from 'remix-utils/client-only'

import { getIpLookupServer, getClientIP } from '~/api/api.server'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { ToolsNav, ToolsNavMobile } from '~/components/ToolsNav'
import { getOgImageUrl, isSelfhosted } from '~/lib/constants'
import { useTheme } from '~/providers/ThemeProvider'
import Button from '~/ui/Button'
import Flag from '~/ui/Flag'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import { FAQ } from '~/ui/FAQ'
import Spin from '~/ui/icons/Spin'
import { cn } from '~/utils/generic'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  const title = 'Free IP Address Lookup tool - What is my IP address?'
  const description =
    'Find your public IP address instantly and look up any IPv4 or IPv6 for detailed geolocation and network data: country, region, city, coordinates, timezone, ISP, organization, connection type, and EU status, plus an interactive map. Free, no registration or limits.'
  return [
    ...getTitle(title),
    ...getDescription(description),
    ...getPreviewImage(getOgImageUrl(title, description)),
  ]
}

export const sitemap: SitemapFunction = () => ({
  priority: 0.8,
  exclude: isSelfhosted,
})

export async function loader({ request }: { request: Request }) {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  const userIp = getClientIP(request) || ''

  if (!userIp) {
    return {
      userIp: '',
      initialData: null,
    }
  }

  const result = await getIpLookupServer(request, userIp)

  return {
    userIp,
    initialData: result.data,
  }
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData()
  const ip = formData.get('ip') as string | null

  const clientIp = getClientIP(request) || ''
  const result = await getIpLookupServer(request, ip || clientIp)

  return {
    data: result.data,
    error: result.error,
  }
}

interface LocationMapProps {
  latitude: number
  longitude: number
}

const MAP_MARKER_STYLE = `
@keyframes ipMarkerPing {
  0%   { transform: scale(1);   opacity: 0.55; }
  80%  { transform: scale(2.6); opacity: 0;    }
  100% { transform: scale(2.6); opacity: 0;    }
}
.ip-marker { pointer-events: none; }
.leaflet-container { background: transparent; font-family: inherit; }
.leaflet-control-zoom { border: none !important; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08) !important; border-radius: 0.5rem !important; overflow: hidden; }
.leaflet-control-zoom a { background-color: rgb(255 255 255 / 0.95) !important; color: rgb(15 23 42) !important; border: none !important; transition: background-color 150ms ease; }
.leaflet-control-zoom a:hover { background-color: rgb(255 255 255) !important; color: rgb(15 23 42) !important; }
.dark .leaflet-control-zoom a { background-color: rgb(15 23 42 / 0.95) !important; color: rgb(241 245 249) !important; }
.dark .leaflet-control-zoom a:hover { background-color: rgb(15 23 42) !important; color: rgb(255 255 255) !important; }
`

function LocationMap({ latitude, longitude }: LocationMapProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [modules, setModules] = useState<{
    rl: typeof import('react-leaflet') | null
    L: typeof import('leaflet') | null
  }>({ rl: null, L: null })

  useEffect(() => {
    Promise.all([import('react-leaflet'), import('leaflet')]).then(
      ([rl, L]) => {
        setModules({ rl, L })
      },
    )
  }, [])

  const icon = useMemo(() => {
    if (!modules.L) return null
    const dot = isDark ? '#f1f5f9' : '#0f172a'
    const ring = isDark ? '#0f172a' : '#ffffff'
    const html = `
      <span style="position:absolute;inset:0;border-radius:9999px;background:${dot};opacity:0.55;animation:ipMarkerPing 2s cubic-bezier(0.16,1,0.3,1) infinite;transform-origin:center;"></span>
      <span style="position:absolute;inset:0;border-radius:9999px;background:${dot};border:2px solid ${ring};box-shadow:0 1px 6px rgba(15,23,42,0.45);"></span>
    `
    return modules.L.divIcon({
      className: 'ip-marker',
      html: `<div style="position:relative;width:14px;height:14px;">${html}</div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
  }, [modules.L, isDark])

  if (!modules.rl || !icon) {
    return (
      <div className='flex h-[420px] items-center justify-center bg-gray-50 sm:h-[480px] dark:bg-slate-900'>
        <Spin />
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker } = modules.rl

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`

  return (
    <div className='relative isolate'>
      <link
        rel='stylesheet'
        href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
      />
      <style>{MAP_MARKER_STYLE}</style>
      <MapContainer
        key={isDark ? 'dark' : 'light'}
        center={[latitude, longitude]}
        zoom={11}
        scrollWheelZoom
        zoomControl
        attributionControl={false}
        style={{
          height: '480px',
          width: '100%',
          background: isDark ? 'rgb(15 23 42)' : 'rgb(249 250 251)',
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />
        <Marker position={[latitude, longitude]} icon={icon} />
      </MapContainer>

      <a
        href={gmapsUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:text-gray-900 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:text-white'
      >
        Open in Google Maps
        <ArrowSquareOutIcon className='size-3' weight='bold' />
      </a>
    </div>
  )
}

const FAQ_ITEMS = [
  {
    question: 'How accurate is IP geolocation?',
    answer:
      "IP geolocation is generally accurate at the country and region level (95%+ accuracy). City-level accuracy varies between 50-80% depending on the ISP and network infrastructure. The coordinates provided are approximate and typically point to the ISP's network center rather than your exact physical location.",
  },
  {
    question: 'Can I hide my IP address?',
    answer:
      'Yes, you can hide your real IP address using a VPN (Virtual Private Network), proxy server, or the Tor browser. These tools route your traffic through different servers, masking your original IP address and location.',
  },
  {
    question: 'Why does my IP location seem wrong?',
    answer:
      "IP geolocation databases may show incorrect locations due to: VPN or proxy usage, outdated database information, mobile network routing, or ISP infrastructure locations. The location shown typically represents where your ISP's network infrastructure is located, not your exact physical address.",
  },
  {
    question: 'Is IP lookup free?',
    answer:
      'Yes, our IP lookup tool is completely free to use. You can check your own IP address or look up any public IP address without any cost or registration required.',
  },
  {
    question: 'What is ASN?',
    answer:
      'ASN (Autonomous System Number) is a unique identifier assigned to networks on the internet. It helps identify which organization owns and operates a particular block of IP addresses, such as an ISP, company, or university.',
  },
  {
    question: 'What is the difference between ISP and organization?',
    answer:
      'The ISP (Internet Service Provider) is the company that delivers internet connectivity to the IP address, such as Comcast, Vodafone, or Deutsche Telekom. The organization is the entity that has been allocated or is using that IP block. It is often the same as the ISP, but for corporate, hosting, or government IPs it can be a specific company, data center provider, or institution.',
  },
  {
    question: 'What do user type and connection type mean?',
    answer:
      'User type describes the kind of network behind the IP address. Common values include residential, business, cellular, hosting, school, government, and library. Connection type describes the underlying network technology, such as Cable/DSL, Cellular, Corporate, Dialup, or Satellite. Together they help identify whether traffic is coming from a home user, a mobile network, a data center, or an enterprise.',
  },
  {
    question: 'What is the difference between IPv4 and IPv6?',
    answer:
      'IPv4 uses 32-bit addresses (e.g., 192.168.1.1) and supports about 4.3 billion addresses. IPv6 uses 128-bit addresses (e.g., 2001:0db8:85a3::8a2e:0370:7334) and provides virtually unlimited addresses. Both formats are supported by our IP lookup tool.',
  },
  {
    question: 'Can I use this tool for security purposes?',
    answer:
      'Yes, IP lookup is commonly used for security purposes including identifying suspicious login attempts, tracking potential threats, verifying user locations for fraud prevention, and investigating security incidents.',
  },
  {
    question: "How can I track my website visitors' locations?",
    answer:
      'Swetrix provides privacy-focused website analytics that includes visitor geolocation data. You can see where your visitors come from by country, region, and city while respecting their privacy and complying with GDPR regulations.',
  },
]

interface RowProps {
  label: string
  value: React.ReactNode
  secondary?: string | null
  leading?: React.ReactNode
  mono?: boolean
}

function Row({ label, value, secondary, leading, mono }: RowProps) {
  if (value === null || value === undefined || value === '') return null

  return (
    <div className='flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-6 sm:py-3.5'>
      <dt className='text-sm text-gray-500 sm:w-44 sm:shrink-0 dark:text-slate-400'>
        {label}
      </dt>
      <dd className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
        {leading}
        <Text
          weight='medium'
          size='sm'
          className={cn(
            'min-w-0 wrap-break-word',
            mono && 'font-mono tabular-nums',
          )}
        >
          {value}
        </Text>
        {secondary ? (
          <Text
            size='xs'
            colour='muted'
            className='font-mono uppercase tabular-nums'
          >
            {secondary}
          </Text>
        ) : null}
      </dd>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text
      as='h3'
      size='xs'
      weight='semibold'
      colour='muted'
      tracking='wide'
      className='uppercase'
    >
      {children}
    </Text>
  )
}

function Dot() {
  return (
    <span
      aria-hidden='true'
      className='size-0.5 rounded-full bg-gray-300 dark:bg-slate-600'
    />
  )
}

function CopyButton({
  value,
  ariaLabel = 'Copy',
}: {
  value: string
  ariaLabel?: string
}) {
  const [copied, setCopied] = useState(false)

  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // ignore
    }
  }

  return (
    <button
      type='button'
      onClick={onCopy}
      aria-label={copied ? 'Copied' : ariaLabel}
      className='inline-flex shrink-0 items-center justify-center rounded-md p-1.5 text-gray-500 ring-1 ring-transparent transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-gray-300 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus-visible:ring-slate-700'
    >
      {copied ? (
        <CheckIcon className='size-4' weight='bold' />
      ) : (
        <CopyIcon className='size-4' />
      )}
    </button>
  )
}

const formatLocalTime = (timezone: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(new Date())
  } catch {
    return ''
  }
}

function LocalTime({ timezone }: { timezone: string }) {
  const [time, setTime] = useState(() => formatLocalTime(timezone))

  useEffect(() => {
    setTime(formatLocalTime(timezone))
    const id = setInterval(() => setTime(formatLocalTime(timezone)), 30_000)
    return () => clearInterval(id)
  }, [timezone])

  if (!time) return null
  return <span className='font-mono tabular-nums'>{time}</span>
}

const formatTraitValue = (value: string | null | undefined): string | null => {
  if (!value) return null
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) =>
      /^[A-Z0-9/]+$/.test(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ')
}

export default function IpLookup() {
  const { userIp, initialData } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()

  const [ipInput, setIpInput] = useState(userIp || '')
  const [inputError, setInputError] = useState<string | null>(null)

  const isLoading =
    fetcher.state === 'submitting' || fetcher.state === 'loading'
  const data = fetcher.data?.data || initialData
  const apiError = fetcher.data?.error

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setInputError(null)

    if (!ipInput.trim()) {
      setInputError('Please enter an IP address')
      return
    }

    fetcher.submit({ ip: ipInput }, { method: 'post' })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIpInput(e.target.value)
    if (inputError) {
      setInputError(null)
    }
  }

  const displayError =
    inputError ||
    (typeof apiError === 'string'
      ? apiError
      : apiError
        ? 'Failed to lookup IP address'
        : null)

  const hasCoordinates =
    data?.latitude !== null &&
    data?.longitude !== null &&
    data?.latitude !== undefined &&
    data?.longitude !== undefined

  const locationLine = data
    ? [data.city, data.region, data.countryName].filter(Boolean).join(', ') ||
      null
    : null

  const networkHasData = !!(
    data &&
    (data.isp || data.organization || data.userType || data.connectionType)
  )

  const isHosting = data?.userType === 'hosting'

  const showUseMyIp =
    !!userIp && !!ipInput && ipInput.trim() !== userIp && !isLoading

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 lg:hidden' />

        <div className='lg:flex lg:items-start lg:gap-8'>
          <div className='min-w-0 lg:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              IP Address Lookup
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Find your IP address and get detailed geolocation and network
              data, including ISP, organization, and connection type, for any
              public IP.
            </Text>

            <div className='mt-10'>
              <form
                onSubmit={handleSubmit}
                className='flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3'
              >
                <Input
                  type='text'
                  placeholder='Enter IP address (e.g., 8.8.8.8)'
                  value={ipInput}
                  onChange={handleInputChange}
                  error={displayError}
                  className='sm:flex-1'
                  spellCheck={false}
                  autoCapitalize='off'
                  autoComplete='off'
                />
                <Button
                  type='submit'
                  disabled={isLoading}
                  className='sm:mt-px'
                  loading={isLoading}
                >
                  {isLoading ? null : (
                    <MagnifyingGlassIcon className='mr-1.5 h-4 w-4' />
                  )}
                  Lookup
                </Button>
              </form>

              {showUseMyIp ? (
                <div className='mt-2'>
                  <button
                    type='button'
                    onClick={() => {
                      setIpInput(userIp)
                      setInputError(null)
                      fetcher.submit({ ip: userIp }, { method: 'post' })
                    }}
                    className='text-xs font-medium text-gray-600 underline-offset-2 hover:underline dark:text-slate-400 dark:hover:text-slate-200'
                  >
                    Use my IP ({userIp})
                  </button>
                </div>
              ) : null}
            </div>

            {data ? (
              <div
                className={cn(
                  'mt-12 transition-opacity duration-200',
                  isLoading && 'pointer-events-none opacity-60',
                )}
              >
                <header className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='flex min-w-0 items-start gap-4'>
                    {data.country ? (
                      <Flag
                        country={data.country}
                        size={40}
                        alt={data.countryName || data.country}
                        className='mt-1.5 shrink-0 rounded-xs ring-1 ring-gray-200/80 dark:ring-slate-700/60'
                      />
                    ) : null}
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-1'>
                        <Text
                          as='p'
                          size='3xl'
                          weight='semibold'
                          tracking='tight'
                          className='font-mono break-all'
                        >
                          {data.ip}
                        </Text>
                        <CopyButton
                          value={data.ip}
                          ariaLabel='Copy IP address'
                        />
                      </div>
                      {locationLine ? (
                        <Text
                          as='p'
                          size='lg'
                          colour='muted'
                          className='mt-1 wrap-break-word'
                        >
                          {locationLine}
                        </Text>
                      ) : null}
                      <div className='mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm'>
                        {data.ipVersion ? (
                          <Text size='sm' colour='muted'>
                            IPv{data.ipVersion}
                          </Text>
                        ) : null}
                        {data.isInEuropeanUnion ? (
                          <>
                            <Dot />
                            <Text size='sm' colour='muted'>
                              European Union
                            </Text>
                          </>
                        ) : null}
                        {isHosting ? (
                          <>
                            <Dot />
                            <Text size='sm' colour='warning'>
                              Data center
                            </Text>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {data.timezone ? (
                    <ClientOnly fallback={null}>
                      {() => (
                        <div className='inline-flex shrink-0 items-center gap-1.5 text-gray-500 dark:text-slate-400'>
                          <ClockIcon className='size-4' weight='duotone' />
                          <Text size='sm' colour='muted'>
                            <LocalTime timezone={data.timezone!} /> local
                          </Text>
                        </div>
                      )}
                    </ClientOnly>
                  ) : null}
                </header>

                {hasCoordinates ? (
                  <div className='relative mt-8 overflow-hidden rounded-lg ring-1 ring-black/5 dark:ring-white/10'>
                    <ClientOnly
                      fallback={
                        <div className='flex h-[420px] items-center justify-center bg-gray-100 sm:h-[480px] dark:bg-slate-900'>
                          <Spin />
                        </div>
                      }
                    >
                      {() => (
                        <LocationMap
                          latitude={data.latitude!}
                          longitude={data.longitude!}
                        />
                      )}
                    </ClientOnly>
                  </div>
                ) : null}

                <div
                  className={cn(
                    hasCoordinates ? 'mt-10' : 'mt-8',
                    networkHasData && 'xl:grid xl:grid-cols-2 xl:gap-x-12',
                  )}
                >
                  <div>
                    <SectionHeader>Location</SectionHeader>
                    <dl className='mt-3 divide-y divide-gray-100 border-y border-gray-100 dark:divide-slate-800/70 dark:border-slate-800/70'>
                      <Row
                        label='Country'
                        value={data.countryName}
                        secondary={data.country}
                        leading={
                          data.country ? (
                            <Flag
                              country={data.country}
                              size={18}
                              alt={data.countryName || data.country}
                              className='shrink-0 rounded-xs ring-1 ring-gray-200/70 dark:ring-slate-700/70'
                            />
                          ) : null
                        }
                      />
                      <Row
                        label='Region'
                        value={data.region}
                        secondary={data.regionCode}
                      />
                      <Row label='City' value={data.city} />
                      <Row label='Postal code' value={data.postalCode} />
                      <Row
                        label='Continent'
                        value={data.continentName}
                        secondary={data.continentCode}
                      />
                      <Row
                        label='Coordinates'
                        mono
                        value={
                          hasCoordinates
                            ? `${data.latitude?.toFixed(4)}, ${data.longitude?.toFixed(4)}`
                            : null
                        }
                      />
                      <Row label='Timezone' value={data.timezone} mono />
                    </dl>
                  </div>

                  {networkHasData ? (
                    <div className='mt-10 xl:mt-0'>
                      <SectionHeader>Network</SectionHeader>
                      <dl className='mt-3 divide-y divide-gray-100 border-y border-gray-100 dark:divide-slate-800/70 dark:border-slate-800/70'>
                        <Row label='ISP' value={data.isp} />
                        <Row label='Organization' value={data.organization} />
                        <Row
                          label='User type'
                          value={formatTraitValue(data.userType)}
                        />
                        <Row
                          label='Connection type'
                          value={formatTraitValue(data.connectionType)}
                        />
                      </dl>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-700'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                Free IP Address Lookup Tool
              </Text>
              <Text
                as='p'
                size='lg'
                colour='muted'
                className='mt-4 leading-relaxed'
              >
                Wondering "what is my IP address?" Our free IP lookup tool
                instantly shows your public IP address and provides detailed
                geolocation data including country, city, region, coordinates,
                and timezone, plus network details like ISP, organization, user
                type, and connection type. You can also look up any IPv4 or IPv6
                address to find its location and network information.
              </Text>

              <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    What is an IP Address?
                  </Text>
                  <Text as='p' colour='muted' className='mt-3'>
                    An IP (Internet Protocol) address is a unique numerical
                    identifier assigned to every device connected to the
                    internet. It works like a mailing address, allowing data to
                    be routed to and from your device. There are two formats:{' '}
                    <Text as='span' weight='semibold' colour='inherit'>
                      IPv4
                    </Text>{' '}
                    (e.g., 192.168.1.1) with about 4.3 billion possible
                    addresses, and{' '}
                    <Text as='span' weight='semibold' colour='inherit'>
                      IPv6
                    </Text>{' '}
                    (e.g., 2001:0db8:85a3::8a2e:0370:7334) which provides
                    virtually unlimited addresses.
                  </Text>
                </div>

                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    How IP Geolocation Works
                  </Text>
                  <Text as='p' colour='muted' className='mt-3'>
                    IP geolocation determines the approximate physical location
                    of an IP address by analyzing routing information and
                    regional IP allocations. Our tool uses the DB-IP database to
                    provide accurate country-level data (95%+ accuracy) and
                    city-level estimates (50-80% accuracy). The location
                    typically represents your ISP's network center, not your
                    exact address.
                  </Text>
                </div>

                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Common Use Cases
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Security monitoring
                        </Text>{' '}
                        - Identify suspicious login attempts from unusual
                        locations
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Fraud prevention
                        </Text>{' '}
                        - Verify user locations to detect potentially fraudulent
                        activity
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Content localization
                        </Text>{' '}
                        - Serve region-specific content based on visitor
                        location
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Compliance
                        </Text>{' '}
                        - Enforce geographic restrictions for regulatory
                        requirements
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Analytics
                        </Text>{' '}
                        - Understand where your website visitors are located
                      </Text>
                    </li>
                  </ul>
                </div>

                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    What Data is Included
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Geographic location
                        </Text>{' '}
                        - Country, region/state, city, and postal code
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Coordinates
                        </Text>{' '}
                        - Latitude and longitude for mapping
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Timezone
                        </Text>{' '}
                        - The timezone associated with the IP location
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          IP version
                        </Text>{' '}
                        - Whether the address is IPv4 or IPv6
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          ISP &amp; organization
                        </Text>{' '}
                        - The internet service provider and the organization
                        operating the IP block
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          User &amp; connection type
                        </Text>{' '}
                        - Whether the IP belongs to a residential, business,
                        cellular, or hosting network, and the underlying
                        connection (Cable/DSL, cellular, corporate, etc.)
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          EU status
                        </Text>{' '}
                        - Whether the IP is located in the European Union
                      </Text>
                    </li>
                  </ul>
                </div>
              </div>

              <div className='mt-12'>
                <Text as='h3' size='xl' weight='semibold'>
                  How to Use This IP Checker
                </Text>
                <Text as='p' colour='muted' className='mt-3'>
                  Your IP address is automatically detected when you visit this
                  page. To look up a different IP, simply enter any public IPv4
                  or IPv6 address in the search box above and click "Lookup."
                  The results will show the geographic location on an
                  interactive map along with detailed network information. This
                  tool is completely free - no registration or limits.
                </Text>
              </div>
            </section>

            <section className='mt-16'>
              <Text as='h2' size='2xl' weight='bold' className='mb-6'>
                FAQ
              </Text>

              <div className='space-y-3'>
                <FAQ items={FAQ_ITEMS} withStructuredData />
              </div>
            </section>

            <DitchGoogle />
          </div>

          <aside className='hidden lg:sticky lg:top-12 lg:block lg:w-64 lg:shrink-0 lg:self-start'>
            <ToolsNav />
          </aside>
        </div>
      </main>
    </div>
  )
}
