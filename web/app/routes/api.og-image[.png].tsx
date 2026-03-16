/* oxlint-disable react/no-unknown-property */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ImageResponse } from '@takumi-rs/image-response'
import type { LoaderFunctionArgs } from 'react-router'

import { API_URL } from '~/lib/constants'

const MAX_TITLE_LENGTH = 65
const MAX_DESCRIPTION_LENGTH = 200
const MAX_PROJECT_NAME_LENGTH = 40

const logoData = readFileSync(
  join(process.cwd(), 'public', 'assets', 'logo', 'blue.png'),
)

const persistentImages = [
  {
    src: 'swetrix-logo',
    data: logoData.buffer as ArrayBuffer,
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

function GridBackground() {
  return (
    <>
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
        style={{ position: 'absolute', top: 0, left: 0 }}
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
    </>
  )
}

function SwetrixLogo() {
  return (
    <div tw='flex items-center' style={{ gap: '18px' }}>
      <img src='swetrix-logo' alt='' width={52} height={60} />
      <div style={{ fontSize: 48, fontWeight: 600, color: '#0f172a' }}>
        Swetrix
      </div>
    </div>
  )
}

interface OgImageProps {
  title: string
  description?: string
  label?: string
}

function OgImage({ title, description, label }: OgImageProps) {
  const titleFontSize = title.length > 30 ? 90 : 104

  return (
    <div tw='flex w-full h-full' style={{ backgroundColor: '#f1f5f9' }}>
      <GridBackground />
      <div
        tw='flex flex-col justify-between w-full h-full'
        style={{ padding: '108px 96px' }}
      >
        <SwetrixLogo />
        <div tw='flex flex-col' style={{ maxWidth: '1425px', gap: '9px' }}>
          {label ? (
            <div style={{ fontSize: 36, fontWeight: 600, color: '#4f46e5' }}>
              {label}
            </div>
          ) : null}
          <div
            style={{
              fontSize: titleFontSize,
              fontWeight: 600,
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
                color: '#1e293b',
                marginTop: '3rem',
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

interface ProjectOgImageProps {
  projectName: string
  visitors: number
}

function ProjectOgImage({ projectName, visitors }: ProjectOgImageProps) {
  const titleFontSize = projectName.length > 30 ? 90 : 104

  return (
    <div tw='flex w-full h-full' style={{ backgroundColor: '#f1f5f9' }}>
      <GridBackground />
      <div
        tw='flex flex-col justify-between w-full h-full'
        style={{ padding: '108px 96px' }}
      >
        <SwetrixLogo />
        <div tw='flex flex-col' style={{ maxWidth: '1425px', gap: '9px' }}>
          <div
            style={{
              fontSize: titleFontSize,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              color: '#0f172a',
            }}
          >
            {projectName}
          </div>
          <div
            style={{
              fontSize: 39,
              fontWeight: 400,
              lineHeight: 1.45,
              color: '#1e293b',
              marginTop: '3rem',
            }}
          >
            {formatNumber(visitors)} visitors in the last month
          </div>
        </div>
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
    width: 1800,
    height: 945,
    format: 'png',
    persistentImages,
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
