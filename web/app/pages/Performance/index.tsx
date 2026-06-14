import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import Integrations from '~/components/marketing/Integrations'
import MarketingPricing from '~/components/pricing/MarketingPricing'
import { PERFORMANCE_LIVE_DEMO_URL } from '~/lib/constants'
import { LogoCloud } from '~/components/marketing/LogoCloud'
import {
  ProductMarketingHero,
  ProductMarketingSections,
} from '~/components/marketing/ProductMarketingPage'
import { FeedbackDual } from '~/routes/_index'

const Performance = () => {
  return (
    <div className='overflow-hidden'>
      <main className='bg-gray-50 dark:bg-slate-950'>
        <ProductMarketingHero
          backgroundSrc='/assets/performance-hero-background.webp'
          demoTab='performance'
          descriptionKey='performance.description'
          liveDemoUrl={PERFORMANCE_LIVE_DEMO_URL}
          screenshotAlt='Swetrix Performance Monitoring'
          screenshotDarkSrc='/assets/screenshot_perf_dark.png'
          screenshotLightSrc='/assets/screenshot_perf_light.png'
          sloganKey='performance.slogan'
          tone='amber'
        />

        <LogoCloud />

        <ProductMarketingSections variant='performance' />

        <Integrations />

        <MarketingPricing />

        <FeedbackDual />

        <DitchGoogle />
      </main>
    </div>
  )
}

export default Performance
