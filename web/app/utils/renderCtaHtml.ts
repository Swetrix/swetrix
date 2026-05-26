import routes from './routes'

const checkIconSvg = `<svg class="size-4 text-gray-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20"/><path d="m9 12 2 2 4-4"/></svg>`

const arrowRightSvg = `<svg class="mt-[1px] ml-1 h-4 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd" /></svg>`

type ForestCtaOptions = {
  titleHtml: string
  description: string
  ctaLabel: string
  trustItems: string[]
}

function renderForestCtaHtml({
  titleHtml,
  description,
  ctaLabel,
  trustItems,
}: ForestCtaOptions): string {
  return `
<div class="not-prose relative mx-auto my-10 max-w-4xl px-2 lg:px-0">
  <div class="relative isolate overflow-hidden rounded-4xl bg-slate-950 px-5 py-10 ring-1 ring-black/5 sm:px-8 sm:py-14 lg:px-12 lg:py-18 dark:ring-white/10">
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
      <img alt="" class="absolute inset-0 size-full object-cover object-center opacity-80 saturate-125" src="/assets/hero-background.webp" loading="lazy" />
      <div class="absolute inset-0 bg-slate-950/65"></div>
      <div class="absolute inset-0 bg-radial-[at_50%_38%] from-red-950/20 via-slate-950/20 to-slate-950/85"></div>
    </div>

    <div class="relative mx-auto flex max-w-5xl flex-col items-center text-center">
      <h2 class="max-w-5xl text-3xl font-bold tracking-tight text-gray-50 sm:text-4xl lg:text-5xl">
        ${titleHtml}
      </h2>
      <p class="mt-6 max-w-3xl text-lg leading-8 text-gray-200">
        ${description}
      </p>
      <div class="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
        <a
          href="${routes.signup}"
          class="inline-flex h-12 items-center justify-center rounded-md bg-white px-5 text-slate-950 ring-1 ring-white/30 transition-colors hover:bg-gray-100"
        >
          <span class="text-center text-base font-semibold">${ctaLabel}</span>
          ${arrowRightSvg}
        </a>
      </div>

      <div class="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-gray-200">
        ${trustItems
          .map(
            (item) => `<div class="flex items-center gap-2">
          ${checkIconSvg}
          ${item}
        </div>`,
          )
          .join('')}
      </div>
    </div>
  </div>
</div>
`
}

export function renderTimeToSwitchCta(): string {
  return renderForestCtaHtml({
    titleHtml: 'The web analytics your site deserves.',
    description:
      "Tired of bloated dashboards, privacy concerns, and data you can't trust? Switch to Swetrix and get simple, powerful analytics that respects your users.",
    ctaLabel: 'Start your free trial',
    trustItems: ['Cancel anytime', '5 minute setup', 'GDPR compliant'],
  })
}

export function renderDitchGoogleCta(): string {
  return renderForestCtaHtml({
    titleHtml:
      'Time to <span class="text-red-400">ditch</span> Google Analytics',
    description:
      "Google Analytics is overkill for most site owners. Swetrix is a simple, privacy-focused alternative that's easy to use and doesn't require cookie consent banners.",
    ctaLabel: 'Start a 14-day free trial',
    trustItems: ['Free to try', 'Easy to use', 'Privacy-first'],
  })
}
