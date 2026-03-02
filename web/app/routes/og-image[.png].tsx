import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ImageResponse } from '@takumi-rs/image-response'
import type { LoaderFunctionArgs } from 'react-router'

const MAX_TITLE_LENGTH = 50
const MAX_DESCRIPTION_LENGTH = 120

const logoData = readFileSync(
  join(process.cwd(), 'public', 'assets', 'logo', 'blue.png'),
)

const persistentImages = [
  {
    src: 'swetrix-logo',
    data: logoData.buffer as ArrayBuffer,
  },
]

interface OgImageProps {
  title: string
  description?: string
  label?: string
}

function OgImage({ title, description, label }: OgImageProps) {
  const titleFontSize = title.length > 30 ? 84 : 96

  return (
    <div tw='flex w-full h-full' style={{ backgroundColor: '#f1f5f9' }}>
      <div
        tw='absolute'
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            'linear-gradient(115deg, #f1f5f9 28%, #a855f7 70%, #4f46e5 100%)',
          opacity: 0.5,
        }}
      />

      <svg
        width='1800'
        height='945'
        viewBox='0 0 1800 945'
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <defs>
          <pattern
            id='grid-pattern'
            width='36'
            height='36'
            patternUnits='userSpaceOnUse'
          >
            <path
              d='M 36 0 L 0 0 L 0 36'
              fill='none'
              stroke='rgba(15, 23, 42, 0.1)'
              strokeWidth='1'
            />
          </pattern>
          <linearGradient id='grid-fade' x1='0%' y1='0%' x2='100%' y2='0%'>
            <stop offset='0%' stopColor='white' stopOpacity='0' />
            <stop offset='50%' stopColor='white' stopOpacity='0' />
            <stop offset='100%' stopColor='white' stopOpacity='1' />
          </linearGradient>
          <mask id='grid-mask'>
            <rect width='1800' height='945' fill='url(#grid-fade)' />
          </mask>
        </defs>
        <rect
          width='1800'
          height='945'
          fill='url(#grid-pattern)'
          mask='url(#grid-mask)'
        />
      </svg>

      <div
        tw='flex flex-col justify-between w-full h-full'
        style={{ padding: '108px 96px' }}
      >
        <div tw='flex items-center' style={{ gap: '18px' }}>
          <img src='swetrix-logo' width={52} height={60} />
          <div
            style={{
              fontSize: 48,
              fontWeight: 600,
              color: '#0f172a',
            }}
          >
            Swetrix
          </div>
        </div>

        <div tw='flex flex-col' style={{ maxWidth: '1425px', gap: '9px' }}>
          {label ? (
            <div
              style={{
                fontSize: 36,
                fontWeight: 600,
                color: '#4f46e5',
              }}
            >
              {label}
            </div>
          ) : null}
          <div
            style={{
              fontSize: titleFontSize,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              color: '#0f172a',
              paddingBottom: description ? '0' : '8rem',
            }}
          >
            {title}
          </div>
          {description ? (
            <div
              style={{
                fontSize: 39,
                fontWeight: 400,
                lineHeight: 1.45,
                color: '#334155',
                marginTop: '18px',
              }}
            >
              {description}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  let title = url.searchParams.get('title') || 'Swetrix'
  let description = url.searchParams.get('description') || ''
  const label = url.searchParams.get('label') || ''

  if (title.length > MAX_TITLE_LENGTH) {
    title = `${title.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    description = `${description.slice(0, MAX_DESCRIPTION_LENGTH).trimEnd()}…`
  }

  return new ImageResponse(
    <OgImage
      title={title}
      description={description || undefined}
      label={label || undefined}
    />,
    {
      width: 1800,
      height: 945,
      format: 'png',
      persistentImages,
      headers: {
        'Cache-Control':
          'public, immutable, no-transform, s-maxage=1210000, max-age=1210000',
      },
    },
  )
}
