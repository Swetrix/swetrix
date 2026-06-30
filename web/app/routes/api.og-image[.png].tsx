/* oxlint-disable react/no-unknown-property */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ImageResponse } from '@takumi-rs/image-response'
import type { LoaderFunctionArgs } from 'react-router'

import { API_URL } from '~/lib/constants'

const MAX_TITLE_LENGTH = 65
const MAX_DESCRIPTION_LENGTH = 200
const MAX_PROJECT_NAME_LENGTH = 40

const WIDTH = 1800
const HEIGHT = 945

const INK = '#0f172a'
const MUTED = '#475569'
const PAPER = '#f1f5f9'
const INDIGO = '#4f46e5'

const logoBuffer = readFileSync(
  join(process.cwd(), 'public', 'assets', 'logo', 'dark.svg'),
)

const persistentImages = [
  {
    src: 'swetrix-logo',
    data: logoBuffer.buffer.slice(
      logoBuffer.byteOffset,
      logoBuffer.byteOffset + logoBuffer.byteLength,
    ),
  },
]

const FONT_DIR = join(process.cwd(), 'public', 'fonts')
const fonts = [
  {
    name: 'Geist',
    weight: 400 as const,
    style: 'normal' as const,
    data: readFileSync(join(FONT_DIR, 'geist-v1-latin-regular.woff2')),
  },
  {
    name: 'Geist',
    weight: 500 as const,
    style: 'normal' as const,
    data: readFileSync(join(FONT_DIR, 'geist-v1-latin-500.woff2')),
  },
  {
    name: 'Geist',
    weight: 600 as const,
    style: 'normal' as const,
    data: readFileSync(join(FONT_DIR, 'geist-v1-latin-600.woff2')),
  },
  {
    name: 'Geist',
    weight: 700 as const,
    style: 'normal' as const,
    data: readFileSync(join(FONT_DIR, 'geist-v1-latin-700.woff2')),
  },
]

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  }

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }

  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  }

  return String(num)
}

function growthPaths() {
  const N = 46
  const left = -60
  const span = WIDTH + 120
  const bottom = HEIGHT + 28
  const rise = 545
  const pts: string[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const trend = 0.08 + Math.pow(t, 1.85) * 0.86
    const noise = Math.sin(i * 12.9898) * 43758.5453
    const jitter = (noise - Math.floor(noise) - 0.5) * 0.05 * (0.3 + t)
    const v = Math.max(0, Math.min(1, trend + jitter))
    const x = left + t * span
    const y = bottom - v * rise
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
  }
  const line = pts.join(' ')
  const area = `${line} L${(left + span).toFixed(1)},${HEIGHT} L${left.toFixed(1)},${HEIGHT} Z`
  return { line, area }
}

const GROWTH = growthPaths()

function PaperTexture() {
  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <defs>
        <pattern id='dots' width='46' height='46' patternUnits='userSpaceOnUse'>
          <circle cx='2' cy='2' r='2.2' fill='rgba(15, 23, 42, 0.07)' />
        </pattern>
        <linearGradient id='dot-fade' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor='white' stopOpacity='1' />
          <stop offset='58%' stopColor='white' stopOpacity='1' />
          <stop offset='100%' stopColor='white' stopOpacity='0' />
        </linearGradient>
        <mask id='dot-mask'>
          <rect width={WIDTH} height={HEIGHT} fill='url(#dot-fade)' />
        </mask>
      </defs>
      <rect
        width={WIDTH}
        height={HEIGHT}
        fill='url(#dots)'
        mask='url(#dot-mask)'
      />
    </svg>
  )
}

function RisingChart() {
  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <defs>
        <linearGradient id='area-fill' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor={INDIGO} stopOpacity='0.16' />
          <stop offset='100%' stopColor={INDIGO} stopOpacity='0' />
        </linearGradient>
      </defs>
      <path d={GROWTH.area} fill='url(#area-fill)' />
      <path
        d={GROWTH.line}
        fill='none'
        stroke={INDIGO}
        strokeWidth='7'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

function SwetrixLogo() {
  return (
    <div tw='flex items-center' style={{ gap: '18px' }}>
      <img src='swetrix-logo' alt='' width={52} height={60} />
      <div style={{ fontSize: 48, fontWeight: 600, color: INK }}>Swetrix</div>
    </div>
  )
}

function Footer() {
  return (
    <div
      tw='flex'
      style={{
        fontSize: 30,
        fontWeight: 700,
        color: INK,
        letterSpacing: '-0.01em',
      }}
    >
      swetrix.com
    </div>
  )
}

function titleSize(length: number): number {
  if (length > 52) return 74
  if (length > 34) return 90
  return 106
}

interface OgImageProps {
  title: string
  description?: string
  label?: string
}

function OgImage({ title, description, label }: OgImageProps) {
  return (
    <div
      tw='relative flex w-full h-full'
      style={{ backgroundColor: PAPER, fontFamily: 'Geist' }}
    >
      <PaperTexture />
      <RisingChart />
      <div
        tw='relative flex flex-col justify-between w-full h-full'
        style={{ padding: '84px 96px 54px' }}
      >
        <div tw='flex flex-col'>
          <SwetrixLogo />
          <div
            tw='flex flex-col'
            style={{ marginTop: 64, maxWidth: 1480, gap: 22 }}
          >
            {label ? (
              <div style={{ fontSize: 34, fontWeight: 600, color: INDIGO }}>
                {label}
              </div>
            ) : null}
            <div
              style={{
                fontSize: titleSize(title.length),
                fontWeight: 600,
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: INK,
              }}
            >
              {title}
            </div>
            {description ? (
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 400,
                  lineHeight: 1.45,
                  color: MUTED,
                  maxWidth: 1240,
                }}
              >
                {description}
              </div>
            ) : null}
          </div>
        </div>
        <Footer />
      </div>
    </div>
  )
}

interface ProjectOgImageProps {
  projectName: string
  visitors: number
}

function ProjectOgImage({ projectName, visitors }: ProjectOgImageProps) {
  return (
    <div
      tw='relative flex w-full h-full'
      style={{ backgroundColor: PAPER, fontFamily: 'Geist' }}
    >
      <PaperTexture />
      <RisingChart />
      <div
        tw='relative flex flex-col justify-between w-full h-full'
        style={{ padding: '84px 96px 54px' }}
      >
        <div tw='flex flex-col'>
          <SwetrixLogo />
          <div
            tw='flex flex-col'
            style={{ marginTop: 64, maxWidth: 1480, gap: 22 }}
          >
            <div
              style={{
                fontSize: titleSize(projectName.length),
                fontWeight: 600,
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: INK,
              }}
            >
              {projectName}
            </div>
            <div
              tw='flex items-center'
              style={{
                fontSize: 36,
                fontWeight: 500,
                color: MUTED,
                gap: 14,
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 700, color: INDIGO }}>
                {formatNumber(visitors)}
              </div>
              visitors in the last month
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  )
}

async function fetchProjectData(
  projectId: string,
): Promise<{ name: string; visitors: number } | null> {
  try {
    const projectRes = await fetch(`${API_URL}project/${projectId}`)

    if (!projectRes.ok) {
      return null
    }

    const project = await projectRes.json()

    if (!project?.public) {
      return null
    }

    const now = new Date()
    const monthAgo = new Date(now)
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    const pidsParam = `["${projectId}"]`
    const birdseyeParams = new URLSearchParams({
      pids: pidsParam,
      period: 'custom',
      from: monthAgo.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
    })

    const birdseyeRes = await fetch(
      `${API_URL}log/birdseye?${birdseyeParams.toString()}`,
    )

    let visitors = 0

    if (birdseyeRes.ok) {
      const birdseyeData = await birdseyeRes.json()
      const projectStats = birdseyeData?.[projectId]

      if (projectStats?.current) {
        visitors = projectStats.current.unique || 0
      }
    }

    return {
      name: project.name || 'Untitled Project',
      visitors,
    }
  } catch {
    return null
  }
}

function renderImage(element: React.JSX.Element, cacheSeconds = 1_210_000) {
  return new ImageResponse(element, {
    width: WIDTH,
    height: HEIGHT,
    format: 'png',
    persistentImages,
    fonts,
    loadDefaultFonts: true,
    headers: {
      'Cache-Control': `public, immutable, no-transform, s-maxage=${cacheSeconds}, max-age=${cacheSeconds}`,
    },
  })
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const projectId = url.searchParams.get('projectId')

  if (projectId) {
    const projectData = await fetchProjectData(projectId)

    if (!projectData) {
      throw new Response(null, { status: 403 })
    }

    let projectName = projectData.name
    if (projectName.length > MAX_PROJECT_NAME_LENGTH) {
      projectName = `${projectName.slice(0, MAX_PROJECT_NAME_LENGTH).trimEnd()}…`
    }

    return renderImage(
      <ProjectOgImage
        projectName={projectName}
        visitors={projectData.visitors}
      />,
      86_400,
    )
  }

  let title = url.searchParams.get('title') || 'Swetrix'
  let description = url.searchParams.get('description') || ''
  const label = url.searchParams.get('label') || ''

  if (title.length > MAX_TITLE_LENGTH) {
    title = `${title.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    description = `${description.slice(0, MAX_DESCRIPTION_LENGTH).trimEnd()}…`
  }

  return renderImage(
    <OgImage
      title={title}
      description={description || undefined}
      label={label || undefined}
    />,
  )
}
