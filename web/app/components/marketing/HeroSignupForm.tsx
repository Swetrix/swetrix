import { ArrowRightIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import FaviconGlyph from '~/ui/FaviconGlyph'
import { trackCustom } from '~/utils/analytics'
import { HERO_SIGNUP_EXPERIMENT } from '~/utils/experiments'
import { localiseTo } from '~/utils/i18nHref'
import routes from '~/utils/routes'
import { extractDomain } from '~/utils/url'

/**
 * The `variant` arm of the hero signup experiment: instead of a bare "start a
 * free trial" button, the first step of onboarding happens right here - type
 * your website, watch the glyph turn into your own favicon, and the signup page
 * greets you with it. The domain rides along as `?site=`, which the signup
 * loader immediately moves into a cookie and the onboarding step reads back.
 *
 * An empty submit is still a perfectly good "start free trial" click, so we
 * never block on the field.
 */
const HeroSignupForm = () => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')
  const navigate = useNavigate()
  const [website, setWebsite] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const domain = extractDomain(website)

    trackCustom('HERO_CTA_CLICK', {
      variant: HERO_SIGNUP_EXPERIMENT.siteInput,
      site: domain ? 'entered' : 'empty',
    })

    navigate(
      localiseTo(
        domain
          ? `${routes.signup}?site=${encodeURIComponent(domain)}`
          : routes.signup,
        language,
      ),
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='mt-8 flex w-full max-w-sm flex-col items-stretch gap-3'
    >
      {/* The same shape as <Input>, in the hero's palette: inset ring, brighter
          on hover, doubled on focus. The wrapper owns the focus treatment, so
          the inner input drops both its outline and the blue ring
          @tailwindcss/forms puts on every bare input. */}
      <div className='flex h-12 items-center rounded-md bg-white/10 pl-3 ring-1 ring-white/20 backdrop-blur-md transition-shadow duration-150 ease-out ring-inset focus-within:ring-2 focus-within:ring-white hover:ring-white/40'>
        <span className='grid size-5 shrink-0 place-items-center text-gray-200'>
          <FaviconGlyph value={website} className='size-5' />
        </span>
        <input
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          placeholder='yourwebsite.com'
          aria-label={t('main.yourWebsite')}
          autoComplete='url'
          inputMode='url'
          className='h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-base text-white outline-hidden placeholder:text-gray-300 focus:ring-0'
        />
      </div>
      <button
        type='submit'
        className='inline-flex h-12 items-center justify-center rounded-md bg-white px-5 text-slate-950 shadow-lg ring-1 shadow-slate-950/20 ring-white/30 transition-colors hover:bg-gray-100'
      >
        <span className='text-center text-base font-semibold'>
          {t('main.addMyWebsite')}
        </span>
        <ArrowRightIcon className='mt-[1px] ml-1 h-4 w-5' />
      </button>
    </form>
  )
}

export default HeroSignupForm
