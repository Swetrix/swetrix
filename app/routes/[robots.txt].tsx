export const loader = () => {
  const robotText = `Sitemap: https://swetrix.com/sitemap.xml

User-agent: *
Disallow: /ref
Disallow: /ref/*
Disallow: /password-reset/*
Disallow: /verify/*
Disallow: /share/*
Disallow: /change-email/*
`

  return new Response(robotText, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
