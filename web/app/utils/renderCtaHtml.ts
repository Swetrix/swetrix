import routes from './routes'

/**
 * Renders the "Time to Switch" CTA component as static HTML
 * This is used in blog posts via the ::CTA:TIME_TO_SWITCH:: placeholder
 */
const checkIconSvg = `<svg class="mr-1 size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`

const arrowRightSvg = `<svg class="mt-[1px] h-4 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd" /></svg>`

/**
 * Renders the "Time to Switch" CTA component as static HTML
 * This is used in blog posts via the ::CTA:TIME_TO_SWITCH:: placeholder
 */
export function renderTimeToSwitchCta(): string {
  return `
<div class="not-prose relative mx-auto my-10 max-w-4xl px-2 lg:px-0">
  <div class="relative mx-auto overflow-hidden rounded-3xl p-1 text-center sm:p-2 lg:p-3">
    <div aria-hidden="true" class="pointer-events-none absolute inset-0">
      <div class="absolute inset-0 rounded-4xl bg-linear-115 from-red-500/50 to-orange-300/30 sm:bg-linear-145 dark:from-red-500/40 dark:to-slate-800/50"></div>
    </div>
    <div class="rounded-xl p-8 backdrop-blur-xl sm:p-10 lg:p-12">
      <div class="mx-auto max-w-3xl">
        <h2 class="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
          The web analytics your site deserves.
        </h2>
        <p class="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-slate-800 dark:text-slate-200">
          Tired of bloated dashboards, privacy concerns, and data you can't trust? Switch to Swetrix and get simple, powerful analytics that respects your users.
        </p>
        <div class="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="${routes.signup}"
            class="flex items-center justify-center rounded-md border-2 border-slate-900 bg-slate-900 px-6 py-3 text-white transition-all hover:bg-transparent hover:text-slate-900 dark:border-slate-50 dark:bg-gray-50 dark:text-slate-900 dark:hover:bg-transparent dark:hover:text-gray-50"
          >
            <span class="mr-1 text-center text-base font-semibold">Start your free trial</span>
            ${arrowRightSvg}
          </a>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-800 dark:text-slate-200">
          <div class="flex items-center">
            ${checkIconSvg}
            Cancel anytime
          </div>
          <div class="flex items-center">
            ${checkIconSvg}
            5 minute setup
          </div>
          <div class="flex items-center">
            ${checkIconSvg}
            GDPR compliant
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`
}

/**
 * Renders the "Ditch Google Analytics" CTA component as static HTML
 * This is used in blog posts via the ::CTA:TIME_TO_DITCH_GOOGLE:: placeholder
 */
export function renderDitchGoogleCta(): string {
  return `
<div class="not-prose relative mx-auto my-10 max-w-4xl px-2 lg:px-0">
  <div class="relative mx-auto overflow-hidden rounded-3xl p-1 text-center sm:p-2 lg:p-3">
    <div aria-hidden="true" class="pointer-events-none absolute inset-0">
      <div class="absolute inset-0 rounded-4xl bg-linear-115 from-red-500/50 to-orange-300/30 sm:bg-linear-145 dark:from-red-500/40 dark:to-orange-300/20"></div>
    </div>
    <div class="rounded-xl p-8 backdrop-blur-xl sm:p-10 lg:p-12">
      <div class="mx-auto max-w-3xl">
        <h2 class="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
          Time to <span class="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">ditch</span> Google Analytics
        </h2>
        <p class="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-slate-800 dark:text-slate-200">
          Google Analytics is overkill for most site owners. Swetrix is a simple, privacy-focused alternative that's easy to use and doesn't require cookie consent banners.
        </p>
        <div class="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="${routes.signup}"
            class="flex items-center justify-center rounded-md border-2 border-slate-900 bg-slate-900 px-6 py-3 text-white transition-all hover:bg-transparent hover:text-slate-900 dark:border-slate-50 dark:bg-gray-50 dark:text-slate-900 dark:hover:bg-transparent dark:hover:text-gray-50"
          >
            <span class="mr-1 text-center text-base font-semibold">Start a 14-day free trial</span>
            ${arrowRightSvg}
          </a>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-800 dark:text-slate-200">
          <div class="flex items-center">
            ${checkIconSvg}
            Free to try
          </div>
          <div class="flex items-center">
            ${checkIconSvg}
            Easy to use
          </div>
          <div class="flex items-center">
            ${checkIconSvg}
            Privacy-first
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`
}
