import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import Integrations from '~/components/marketing/Integrations'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import { ERROR_TRACKING_LIVE_DEMO_URL } from '~/lib/constants'
import { LogoCloud } from '~/components/marketing/LogoCloud'
import {
  ProductMarketingHero,
  ProductMarketingSections,
} from '~/components/marketing/ProductMarketingPage'
import { FeedbackDual } from '~/routes/_index'

const ErrorTracking = () => {
  return (
    <div className='overflow-hidden'>
      <main className='bg-gray-50 dark:bg-slate-950'>
        <ProductMarketingHero
          backgroundSrc='/assets/error-tracking-hero-background.webp'
          demoTab='errors'
          descriptionKey='errors.description'
          liveDemoUrl={ERROR_TRACKING_LIVE_DEMO_URL}
          screenshotAlt='Swetrix Error Tracking'
          screenshotDarkSrc='/assets/screenshot_errors_dark.png'
          screenshotLightSrc='/assets/screenshot_errors_light.png'
          sloganKey='errors.slogan'
          tone='red'
        />

        <LogoCloud />

        <ProductMarketingSections variant='errors' />

        <Integrations />

        <MarketingPricing />

        <FeedbackDual />

        <DitchGoogle />
      </main>
    </div>
  )
}

export default ErrorTracking
