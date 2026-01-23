import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { redirect, useFetcher, useLoaderData } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import { ClientOnly } from 'remix-utils/client-only'

import { getIpLookupServer, getClientIP } from '~/api/api.server'
import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { isSelfhosted } from '~/lib/constants'
import Button from '~/ui/Button'
import Flag from '~/ui/Flag'
import Input from '~/ui/Input'
import { Text } from '~/ui/Text'
import Spin from '~/ui/icons/Spin'

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
  city?: string | null
  country?: string | null
}

function LocationMap({ latitude, longitude, city, country }: LocationMapProps) {
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: any
    TileLayer: any
    Marker: any
    Popup: any
  } | null>(null)

  useEffect(() => {
    import('react-leaflet').then((module) => {
      setMapComponents({
        MapContainer: module.MapContainer,
        TileLayer: module.TileLayer,
        Marker: module.Marker,
        Popup: module.Popup,
      })
    })

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })
    })
  }, [])

  if (!MapComponents) {
    return (
      <div className='flex h-96 items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-800'>
        <Spin />
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup } = MapComponents

  return (
    <>
      <link
        rel='stylesheet'
        href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
      />
      <MapContainer
        center={[latitude, longitude]}
        zoom={10}
        scrollWheelZoom={true}
        style={{ height: '384px', width: '100%', borderRadius: '0.5rem' }}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <Marker position={[latitude, longitude]}>
          <Popup>
            {city && country
              ? `${city}, ${country}`
              : city || country || 'Location'}
          </Popup>
        </Marker>
      </MapContainer>
    </>
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

function DataRow({
  label,
  value,
  secondary,
}: {
  label: string
  value: string | null | undefined
  secondary?: string | null
}) {
  return (
    <div className='flex items-baseline justify-between gap-4 border-b border-gray-100 py-3 last:border-0 dark:border-slate-700/50'>
      <dt className='shrink-0'>
        <Text size='sm' colour='muted'>
          {label}
        </Text>
      </dt>
      <dd className='min-w-0 text-right'>
        <Text weight='medium' className='wrap-break-word'>
          {value || '—'}
        </Text>
        {secondary && (
          <Text size='sm' colour='muted' className='ml-2'>
            {secondary}
          </Text>
        )}
      </dd>
    </div>
  )
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

  const formatLocation = () => {
    const parts = [data?.city, data?.region, data?.countryName].filter(Boolean)
    return parts.join(', ') || null
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-900'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-3xl'>
          <div className='text-center'>
            <Text
              as='h1'
              size='4xl'
              weight='bold'
              tracking='tight'
              className='sm:text-5xl'
            >
              IP Address Lookup
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Find your IP address and get detailed geolocation data for any
              public IP.
            </Text>
          </div>

          <div className='mt-10'>
            <form onSubmit={handleSubmit} className='flex items-start gap-3'>
              <Input
                type='text'
                placeholder='Enter IP address (e.g., 8.8.8.8)'
                value={ipInput}
                onChange={handleInputChange}
                error={displayError}
                className='flex-1'
              />
              <Button
                type='submit'
                primary
                regular
                disabled={isLoading}
                className='mt-px'
              >
                {isLoading ? (
                  <Spin className='h-4 w-4' />
                ) : (
                  <>
                    <MagnifyingGlassIcon className='mr-1.5 h-4 w-4' />
                    Lookup
                  </>
                )}
              </Button>
            </form>
          </div>

          {data && (
            <div className='mt-6 space-y-8'>
              <section className='overflow-hidden rounded-xl bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700'>
                <div className='mb-6 flex items-start gap-4'>
                  {data.country && (
                    <Flag
                      className='shrink-0 rounded-xs'
                      country={data.country}
                      size={40}
                      alt={data.countryName || data.country}
                    />
                  )}
                  <div className='min-w-0 flex-1'>
                    <Text
                      as='p'
                      size='2xl'
                      weight='semibold'
                      className='break-all font-mono'
                    >
                      {data.ip}
                    </Text>
                    {formatLocation() && (
                      <Text as='p' colour='muted' className='mt-0.5 wrap-break-word'>
                        {formatLocation()}
                      </Text>
                    )}
                  </div>
                </div>

                <dl>
                  <DataRow
                    label='IP Version'
                    value={data.ipVersion ? `IPv${data.ipVersion}` : null}
                  />
                  <DataRow
                    label='Country'
                    value={data.countryName}
                    secondary={data.country}
                  />
                  <DataRow
                    label='Region'
                    value={data.region}
                    secondary={data.regionCode}
                  />
                  <DataRow label='City' value={data.city} />
                  <DataRow label='Postal Code' value={data.postalCode} />
                  <DataRow
                    label='Continent'
                    value={data.continentName}
                    secondary={data.continentCode}
                  />
                  <DataRow
                    label='Coordinates'
                    value={
                      hasCoordinates
                        ? `${data.latitude?.toFixed(4)}, ${data.longitude?.toFixed(4)}`
                        : null
                    }
                  />
                  <DataRow label='Timezone' value={data.timezone} />
                  {data.isInEuropeanUnion && (
                    <DataRow label='EU Member' value='Yes' />
                  )}
                </dl>
              </section>

              {hasCoordinates && (
                <section className='overflow-hidden rounded-xl ring-1 ring-gray-200 dark:ring-slate-700'>
                  <ClientOnly
                    fallback={
                      <div className='flex h-96 items-center justify-center bg-gray-50 dark:bg-slate-800'>
                        <Spin />
                      </div>
                    }
                  >
                    {() => (
                      <LocationMap
                        latitude={data.latitude!}
                        longitude={data.longitude!}
                        city={data.city}
                        country={data.countryName}
                      />
                    )}
                  </ClientOnly>
                </section>
              )}
            </div>
          )}

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
              geolocation data including country, city, region, coordinates, and
              timezone. You can also look up any IPv4 or IPv6 address to find
              its location and network information.
            </Text>

            <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
              <div>
                <Text as='h3' size='xl' weight='semibold'>
                  What is an IP Address?
                </Text>
                <Text as='p' colour='muted' className='mt-3'>
                  An IP (Internet Protocol) address is a unique numerical
                  identifier assigned to every device connected to the internet.
                  It works like a mailing address, allowing data to be routed to
                  and from your device. There are two formats:{' '}
                  <Text as='span' weight='semibold' colour='inherit'>
                    IPv4
                  </Text>{' '}
                  (e.g., 192.168.1.1) with about 4.3 billion possible addresses,
                  and{' '}
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
                  IP geolocation determines the approximate physical location of
                  an IP address by analyzing routing information and regional IP
                  allocations. Our tool uses the DB-IP database to provide
                  accurate country-level data (95%+ accuracy) and city-level
                  estimates (50-80% accuracy). The location typically represents
                  your ISP's network center, not your exact address.
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
                      - Serve region-specific content based on visitor location
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
                page. To look up a different IP, simply enter any public IPv4 or
                IPv6 address in the search box above and click "Lookup." The
                results will show the geographic location on an interactive map
                along with detailed network information. This tool is completely
                free - no registration or limits.
              </Text>
            </div>
          </section>

          <section className='mt-16'>
            <Text as='h2' size='2xl' weight='bold' className='mb-6'>
              FAQ
            </Text>

            <div className='space-y-3'>
              {FAQ_ITEMS.map((item, index) => (
                <details
                  key={index}
                  className='group rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                >
                  <summary className='flex cursor-pointer items-center justify-between px-5 py-4 text-left'>
                    <Text weight='medium'>{item.question}</Text>
                    <ChevronDownIcon className='h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180' />
                  </summary>
                  <div className='border-t border-gray-200 px-5 py-4 dark:border-slate-700'>
                    <Text as='p' colour='muted'>
                      {item.answer}
                    </Text>
                  </div>
                </details>
              ))}
            </div>
          </section>

          <script
            type='application/ld+json'
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: FAQ_ITEMS.map((item) => ({
                  '@type': 'Question',
                  name: item.question,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer,
                  },
                })),
              })
                .replace(/</g, '\\u003c')
                .replace(/\u2028|\u2029/g, ''),
            }}
          />

          <DitchGoogle />
        </div>
      </main>
    </div>
  )
}
