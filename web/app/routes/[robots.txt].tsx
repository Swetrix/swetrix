import { isSelfhosted } from '~/lib/constants'

const PRODUCTION_ROBOTS = `Sitemap: https://swetrix.com/sitemap.xml

User-agent: *
Disallow: /ref
Disallow: /ref/*
Disallow: /password-reset/*
Disallow: /verify/*
Disallow: /share/*
Disallow: /change-email/*
Disallow: /3rd-party-unsubscribe/*
Disallow: /captchas/*
Disallow: /organisation/invite/*
Disallow: /project/transfer/*
Disallow: /reports-unsubscribe/*
`

const SELFHOSTED_ROBOTS = `User-agent: *
Disallow: /`

export const loader = () => {
  return new Response(isSelfhosted ? SELFHOSTED_ROBOTS : PRODUCTION_ROBOTS, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
