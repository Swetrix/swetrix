import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash, randomUUID } from 'crypto'
import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { Repository } from 'typeorm'
import { SessionReplayS3Service } from '../analytics/session-replay-s3.service'
import { eventTransformer } from '../analytics/utils/transformers'
import { redis } from '../common/constants'
import { clickhouse } from '../common/integrations/clickhouse'
import {
  Experiment,
  ExperimentStatus,
  ExposureTrigger,
  FeatureFlagMode,
  MultipleVariantHandling,
} from '../experiment/entity/experiment.entity'
import { ExperimentVariant } from '../experiment/entity/experiment-variant.entity'
import {
  FeatureFlag,
  FeatureFlagType,
} from '../feature-flag/entity/feature-flag.entity'
import { Goal, GoalMatchType, GoalType } from '../goal/entity/goal.entity'
import { Annotation, Funnel, Project } from '../project/entity'
import {
  ProjectViewCustomEventEntity,
  ProjectViewCustomEventMetaValueType,
} from '../project/entity/project-view-custom-event.entity'
import {
  ProjectViewEntity,
  ProjectViewType,
} from '../project/entity/project-view.entity'

dayjs.extend(utc)

const DEMO_PROJECT_ID = 'DEMODEMODEMO'

const LOCK_KEY = 'demo-data:lock'
const LAST_GENERATED_AT_KEY = 'demo-data:last-generated-at'
const LOCK_TTL_SECONDS = 20 * 60
const LOCK_RENEW_INTERVAL_MS = Math.floor((LOCK_TTL_SECONDS * 1000) / 3)
const BACKFILL_DAYS = 90
const DEMO_HOST = 'swetrix.com'

type DemoRandom = () => number

interface Weighted<T> {
  weight: number
  value: T
}

interface Geo {
  cc: string
  country: string
  region: string
  rgc: string
  city: string
  isp: string
  locale: string
  utcOffset: number
  weight: number
}

interface TrafficSource {
  name: string
  ref: string | null
  so: string | null
  me: string | null
  ca: string | null
  weight: number
  conversionBias: number
  entryPages: Weighted<string>[]
}

interface ClientProfile {
  dv: string
  br: string
  brv: string
  os: string
  osv: string
}

interface JourneyEvent {
  name: string
  page: string
  offsetSeconds: number
  meta: Record<string, string>
}

interface ErrorTemplate {
  name: string
  message: string
  filename: string
  lineno: number
  colno: number
  stack: string[]
}

interface DemoConfig {
  goals: Record<string, Goal>
  flags: Record<string, FeatureFlag>
  experiments: Record<string, Experiment>
}

interface SessionContext {
  psid: string
  profileId: string
  returning: boolean
  identified: boolean
  start: Dayjs
  geo: Geo
  source: TrafficSource
  client: ClientProfile
  pages: string[]
  customEvents: JourneyEvent[]
  variantKeys: Record<string, string>
}

interface SessionReplayChunkRow {
  pid: string
  psid: string
  replayId: string
  chunkIndex: number
  objectKey: string
  privacyMode: string
  eventCount: number
  uncompressedBytes: number
  compressedBytes: number
  firstEventTimestamp: number
  lastEventTimestamp: number
  created: string
  expiresAt: string
}

interface DemoReplayTemplate {
  id: string
  chunks: Array<{
    chunkIndex: number
    objectKey: string
  }>
}

interface DemoRows {
  events: Record<string, unknown>[]
  sessions: Record<string, unknown>[]
  featureFlagEvaluations: Record<string, unknown>[]
  experimentExposures: Record<string, unknown>[]
  replayChunks: SessionReplayChunkRow[]
  revenue: Record<string, unknown>[]
}

const GEO_POOL: Geo[] = [
  {
    cc: 'US',
    country: 'United States',
    region: 'California',
    rgc: 'CA',
    city: 'San Francisco',
    isp: 'Cloudflare WARP',
    locale: 'en-US',
    utcOffset: -7,
    weight: 18,
  },
  {
    cc: 'US',
    country: 'United States',
    region: 'New York',
    rgc: 'NY',
    city: 'New York',
    isp: 'Verizon Business',
    locale: 'en-US',
    utcOffset: -4,
    weight: 14,
  },
  {
    cc: 'GB',
    country: 'United Kingdom',
    region: 'England',
    rgc: 'ENG',
    city: 'London',
    isp: 'BT',
    locale: 'en-GB',
    utcOffset: 1,
    weight: 12,
  },
  {
    cc: 'DE',
    country: 'Germany',
    region: 'Berlin',
    rgc: 'BE',
    city: 'Berlin',
    isp: 'Deutsche Telekom',
    locale: 'de-DE',
    utcOffset: 2,
    weight: 9,
  },
  {
    cc: 'NL',
    country: 'Netherlands',
    region: 'North Holland',
    rgc: 'NH',
    city: 'Amsterdam',
    isp: 'KPN',
    locale: 'nl-NL',
    utcOffset: 2,
    weight: 7,
  },
  {
    cc: 'CA',
    country: 'Canada',
    region: 'Ontario',
    rgc: 'ON',
    city: 'Toronto',
    isp: 'Rogers',
    locale: 'en-CA',
    utcOffset: -4,
    weight: 7,
  },
  {
    cc: 'FR',
    country: 'France',
    region: 'Ile-de-France',
    rgc: 'IDF',
    city: 'Paris',
    isp: 'Orange',
    locale: 'fr-FR',
    utcOffset: 2,
    weight: 6,
  },
  {
    cc: 'IN',
    country: 'India',
    region: 'Karnataka',
    rgc: 'KA',
    city: 'Bengaluru',
    isp: 'Airtel Broadband',
    locale: 'en-IN',
    utcOffset: 5.5,
    weight: 6,
  },
  {
    cc: 'JP',
    country: 'Japan',
    region: 'Tokyo',
    rgc: '13',
    city: 'Tokyo',
    isp: 'NTT Communications',
    locale: 'ja-JP',
    utcOffset: 9,
    weight: 5,
  },
  {
    cc: 'AU',
    country: 'Australia',
    region: 'New South Wales',
    rgc: 'NSW',
    city: 'Sydney',
    isp: 'Telstra',
    locale: 'en-AU',
    utcOffset: 10,
    weight: 4,
  },
  {
    cc: 'BR',
    country: 'Brazil',
    region: 'Sao Paulo',
    rgc: 'SP',
    city: 'Sao Paulo',
    isp: 'Vivo',
    locale: 'pt-BR',
    utcOffset: -3,
    weight: 4,
  },
  {
    cc: 'PL',
    country: 'Poland',
    region: 'Masovian',
    rgc: '14',
    city: 'Warsaw',
    isp: 'Orange Polska',
    locale: 'pl-PL',
    utcOffset: 2,
    weight: 3,
  },
]

const TRAFFIC_SOURCES: TrafficSource[] = [
  {
    name: 'Direct',
    ref: null,
    so: null,
    me: null,
    ca: null,
    weight: 23,
    conversionBias: 1.1,
    entryPages: [
      { weight: 42, value: '/' },
      { weight: 18, value: '/pricing' },
      { weight: 14, value: '/dashboard' },
      { weight: 10, value: '/docs' },
      { weight: 8, value: '/features/session-replays' },
      { weight: 8, value: '/blog/privacy-friendly-analytics' },
    ],
  },
  {
    name: 'Google',
    ref: 'https://www.google.com/',
    so: 'google',
    me: 'organic',
    ca: 'organic-search',
    weight: 21,
    conversionBias: 1,
    entryPages: [
      { weight: 28, value: '/' },
      { weight: 25, value: '/alternatives/google-analytics' },
      { weight: 18, value: '/blog/privacy-friendly-analytics' },
      { weight: 15, value: '/pricing' },
      { weight: 14, value: '/docs' },
    ],
  },
  {
    name: 'Y Combinator',
    ref: 'https://news.ycombinator.com/item?id=42424242',
    so: 'ycombinator',
    me: 'referral',
    ca: 'hn-launch-week',
    weight: 10,
    conversionBias: 1.45,
    entryPages: [
      { weight: 38, value: '/' },
      { weight: 21, value: '/open-source' },
      { weight: 18, value: '/features/session-replays' },
      { weight: 14, value: '/pricing' },
      { weight: 9, value: '/docs' },
    ],
  },
  {
    name: 'Bing',
    ref: 'https://www.bing.com/',
    so: 'bing',
    me: 'organic',
    ca: 'organic-search',
    weight: 8,
    conversionBias: 0.9,
    entryPages: [
      { weight: 31, value: '/' },
      { weight: 24, value: '/alternatives/google-analytics' },
      { weight: 18, value: '/pricing' },
      { weight: 15, value: '/docs' },
      { weight: 12, value: '/blog/cookieless-tracking' },
    ],
  },
  {
    name: 'ChatGPT',
    ref: 'https://chatgpt.com/',
    so: 'chatgpt',
    me: 'ai',
    ca: 'ai-answer',
    weight: 7,
    conversionBias: 1.32,
    entryPages: [
      { weight: 30, value: '/alternatives/google-analytics' },
      { weight: 22, value: '/docs' },
      { weight: 18, value: '/pricing' },
      { weight: 16, value: '/features/session-replays' },
      { weight: 14, value: '/' },
    ],
  },
  {
    name: 'Perplexity',
    ref: 'https://www.perplexity.ai/',
    so: 'perplexity',
    me: 'ai',
    ca: 'ai-search',
    weight: 5,
    conversionBias: 1.22,
    entryPages: [
      { weight: 32, value: '/blog/privacy-friendly-analytics' },
      { weight: 23, value: '/alternatives/google-analytics' },
      { weight: 17, value: '/docs' },
      { weight: 15, value: '/pricing' },
      { weight: 13, value: '/features/errors' },
    ],
  },
  {
    name: 'Claude',
    ref: 'https://claude.ai/',
    so: 'claude',
    me: 'ai',
    ca: 'ai-answer',
    weight: 4,
    conversionBias: 1.18,
    entryPages: [
      { weight: 29, value: '/docs' },
      { weight: 24, value: '/open-source' },
      { weight: 19, value: '/features/session-replays' },
      { weight: 16, value: '/pricing' },
      { weight: 12, value: '/' },
    ],
  },
  {
    name: 'Product Hunt',
    ref: 'https://www.producthunt.com/posts/swetrix',
    so: 'producthunt',
    me: 'referral',
    ca: 'producthunt-demo',
    weight: 8,
    conversionBias: 1.35,
    entryPages: [
      { weight: 47, value: '/' },
      { weight: 21, value: '/pricing' },
      { weight: 16, value: '/features/errors' },
      { weight: 16, value: '/features/session-replays' },
    ],
  },
  {
    name: 'GitHub',
    ref: 'https://github.com/Swetrix/swetrix',
    so: 'github',
    me: 'referral',
    ca: 'oss-readme',
    weight: 7,
    conversionBias: 1.15,
    entryPages: [
      { weight: 31, value: '/open-source' },
      { weight: 24, value: '/docs' },
      { weight: 18, value: '/' },
      { weight: 14, value: '/pricing' },
      { weight: 13, value: '/features/errors' },
    ],
  },
  {
    name: 'Twitter',
    ref: 'https://x.com/swetrix/status/1800000000000000000',
    so: 'twitter',
    me: 'social',
    ca: 'founder-thread',
    weight: 6,
    conversionBias: 0.95,
    entryPages: [
      { weight: 44, value: '/' },
      { weight: 19, value: '/blog/privacy-friendly-analytics' },
      { weight: 16, value: '/features/session-replays' },
      { weight: 12, value: '/pricing' },
      { weight: 9, value: '/docs' },
    ],
  },
  {
    name: 'Newsletter',
    ref: 'https://mail.swetrix.com/campaign/demo-roundup',
    so: 'newsletter',
    me: 'email',
    ca: 'demo-roundup',
    weight: 5,
    conversionBias: 1.2,
    entryPages: [
      { weight: 34, value: '/pricing' },
      { weight: 27, value: '/features/session-replays' },
      { weight: 18, value: '/features/errors' },
      { weight: 13, value: '/docs' },
      { weight: 8, value: '/' },
    ],
  },
  {
    name: 'Capterra',
    ref: 'https://www.capterra.com/p/analytics/swetrix/',
    so: 'capterra',
    me: 'referral',
    ca: 'reviews',
    weight: 5,
    conversionBias: 1.25,
    entryPages: [
      { weight: 35, value: '/pricing' },
      { weight: 24, value: '/' },
      { weight: 18, value: '/features/errors' },
      { weight: 13, value: '/features/session-replays' },
      { weight: 10, value: '/docs' },
    ],
  },
  {
    name: 'Paid Search',
    ref: 'https://www.google.com/aclk?sa=L&ai=demo',
    so: 'google',
    me: 'cpc',
    ca: 'privacy-analytics-q2',
    weight: 7,
    conversionBias: 1.3,
    entryPages: [
      { weight: 32, value: '/pricing' },
      { weight: 27, value: '/alternatives/google-analytics' },
      { weight: 18, value: '/' },
      { weight: 13, value: '/features/session-replays' },
      { weight: 10, value: '/features/errors' },
    ],
  },
]

const DESKTOP_CLIENTS: Weighted<ClientProfile>[] = [
  {
    weight: 38,
    value: {
      dv: 'desktop',
      br: 'Chrome',
      brv: '126.0',
      os: 'macOS',
      osv: '15.5',
    },
  },
  {
    weight: 19,
    value: {
      dv: 'desktop',
      br: 'Chrome',
      brv: '126.0',
      os: 'Windows',
      osv: '11',
    },
  },
  {
    weight: 13,
    value: {
      dv: 'desktop',
      br: 'Firefox',
      brv: '127.0',
      os: 'Windows',
      osv: '11',
    },
  },
  {
    weight: 12,
    value: {
      dv: 'desktop',
      br: 'Safari',
      brv: '18.5',
      os: 'macOS',
      osv: '15.5',
    },
  },
  {
    weight: 9,
    value: {
      dv: 'desktop',
      br: 'Edge',
      brv: '126.0',
      os: 'Windows',
      osv: '11',
    },
  },
  {
    weight: 9,
    value: {
      dv: 'desktop',
      br: 'Firefox',
      brv: '127.0',
      os: 'Linux',
      osv: '6.8',
    },
  },
]

const MOBILE_CLIENTS: Weighted<ClientProfile>[] = [
  {
    weight: 39,
    value: {
      dv: 'mobile',
      br: 'Mobile Safari',
      brv: '18.5',
      os: 'iOS',
      osv: '18.5',
    },
  },
  {
    weight: 36,
    value: {
      dv: 'mobile',
      br: 'Chrome Mobile',
      brv: '126.0',
      os: 'Android',
      osv: '15',
    },
  },
  {
    weight: 12,
    value: {
      dv: 'mobile',
      br: 'Samsung Internet',
      brv: '26.0',
      os: 'Android',
      osv: '15',
    },
  },
  {
    weight: 8,
    value: {
      dv: 'tablet',
      br: 'Mobile Safari',
      brv: '18.5',
      os: 'iPadOS',
      osv: '18.5',
    },
  },
  {
    weight: 5,
    value: {
      dv: 'mobile',
      br: 'Firefox Mobile',
      brv: '127.0',
      os: 'Android',
      osv: '15',
    },
  },
]

const BLOG_PAGES = [
  '/blog/privacy-friendly-analytics',
  '/blog/cookieless-tracking',
  '/blog/session-replay-privacy',
]

const ERROR_TEMPLATES: ErrorTemplate[] = [
  {
    name: 'ChunkLoadError',
    message: 'Loading chunk analytics-dashboard failed.',
    filename: 'https://demo.swetrix.com/assets/dashboard-analytics.js',
    lineno: 118,
    colno: 27,
    stack: [
      'ChunkLoadError: Loading chunk analytics-dashboard failed.',
      'at __webpack_require__.f.j (https://demo.swetrix.com/assets/runtime.js:921:29)',
      'at Promise.all.then.e (https://demo.swetrix.com/assets/runtime.js:132:17)',
      'at async ViewProject (https://demo.swetrix.com/assets/dashboard-analytics.js:118:27)',
    ],
  },
  {
    name: 'TypeError',
    message: "Cannot read properties of undefined (reading 'series')",
    filename: 'https://demo.swetrix.com/assets/charts.js',
    lineno: 244,
    colno: 18,
    stack: [
      "TypeError: Cannot read properties of undefined (reading 'series')",
      'at normalizeChartData (https://demo.swetrix.com/assets/charts.js:244:18)',
      'at TrafficChart.render (https://demo.swetrix.com/assets/charts.js:391:11)',
      'at ViewProject (https://demo.swetrix.com/assets/dashboard.js:77:9)',
    ],
  },
  {
    name: 'NetworkError',
    message: 'Failed to fetch saved segment',
    filename: 'https://demo.swetrix.com/assets/api-client.js',
    lineno: 89,
    colno: 14,
    stack: [
      'NetworkError: Failed to fetch saved segment',
      'at request (https://demo.swetrix.com/assets/api-client.js:89:14)',
      'at loadProjectViews (https://demo.swetrix.com/assets/dashboard.js:502:21)',
    ],
  },
  {
    name: 'HydrationError',
    message: 'Text content does not match server-rendered HTML.',
    filename: 'https://demo.swetrix.com/assets/root.js',
    lineno: 32,
    colno: 9,
    stack: [
      'HydrationError: Text content does not match server-rendered HTML.',
      'at hydrateRoot (https://demo.swetrix.com/assets/root.js:32:9)',
      'at startTransition (https://demo.swetrix.com/assets/react-dom.js:1213:7)',
    ],
  },
  {
    name: 'ResizeObserverLoopError',
    message: 'ResizeObserver loop completed with undelivered notifications.',
    filename: 'https://demo.swetrix.com/assets/layout.js',
    lineno: 171,
    colno: 5,
    stack: [
      'ResizeObserverLoopError: ResizeObserver loop completed with undelivered notifications.',
      'at ResizeObserver.callback (https://demo.swetrix.com/assets/layout.js:171:5)',
      'at GridLayout (https://demo.swetrix.com/assets/layout.js:222:13)',
    ],
  },
]

const GOAL_SEEDS = [
  {
    key: 'signup',
    name: 'Signup',
    type: GoalType.CUSTOM_EVENT,
    value: 'Signup',
  },
  {
    key: 'trial',
    name: 'Trial Started',
    type: GoalType.CUSTOM_EVENT,
    value: 'Trial Started',
  },
  {
    key: 'sale',
    name: 'Sale',
    type: GoalType.CUSTOM_EVENT,
    value: 'Sale',
  },
  {
    key: 'pricing',
    name: 'Pricing Page Visit',
    type: GoalType.PAGEVIEW,
    value: '/pricing',
  },
]

const FUNNEL_SEEDS = [
  {
    name: 'Visitor to Signup',
    steps: ['/', '/pricing', 'Signup'],
  },
  {
    name: 'Checkout Conversion',
    steps: ['/pricing', 'Checkout Started', 'Sale'],
  },
  {
    name: 'Replay Evaluation',
    steps: ['/features/session-replays', '/docs', 'Trial Started'],
  },
]

const FLAG_SEEDS = [
  {
    key: 'checkout-redesign',
    description: 'Shows a compact checkout with trust copy and annual savings.',
    rolloutPercentage: 62,
  },
  {
    key: 'replay-onboarding',
    description: 'Enables the guided replay onboarding checklist.',
    rolloutPercentage: 50,
  },
  {
    key: 'pricing-metered-copy',
    description: 'Tests usage-based pricing copy on the pricing page.',
    rolloutPercentage: 45,
  },
  {
    key: 'docs-ai-search',
    description: 'Enables AI-assisted search inside documentation.',
    rolloutPercentage: 28,
  },
]

const EXPERIMENT_SEEDS = [
  {
    key: 'onboarding-flow',
    name: 'Onboarding Flow Test',
    description: 'Guided checklist versus compact first-project setup.',
    hypothesis: 'A guided checklist increases signup-to-trial conversion.',
    featureFlagKey: 'replay-onboarding',
    goalKey: 'trial',
    variants: [
      {
        key: 'control',
        name: 'Compact setup',
        rolloutPercentage: 50,
        isControl: true,
      },
      {
        key: 'guided',
        name: 'Guided checklist',
        rolloutPercentage: 50,
        isControl: false,
      },
    ],
  },
  {
    key: 'pricing-copy',
    name: 'Pricing Copy Test',
    description: 'Usage-first pricing copy versus social-proof pricing copy.',
    hypothesis: 'Social proof increases paid checkout conversion.',
    featureFlagKey: 'checkout-redesign',
    goalKey: 'sale',
    variants: [
      {
        key: 'control',
        name: 'Usage-first',
        rolloutPercentage: 55,
        isControl: true,
      },
      {
        key: 'social-proof',
        name: 'Social proof',
        rolloutPercentage: 45,
        isControl: false,
      },
    ],
  },
]

const VIEW_SEEDS = [
  {
    name: 'Organic Search',
    type: ProjectViewType.TRAFFIC,
    filters: [{ column: 'me', filter: 'organic', isExclusive: false }],
    customEvents: [],
  },
  {
    name: 'HN Launch Traffic',
    type: ProjectViewType.TRAFFIC,
    filters: [{ column: 'so', filter: 'ycombinator', isExclusive: false }],
    customEvents: [
      {
        customEventName: 'Signup',
        metricKey: 'count',
        metaKey: null,
        metaValue: null,
        metaValueType: ProjectViewCustomEventMetaValueType.STRING,
      },
    ],
  },
  {
    name: 'Mobile Performance',
    type: ProjectViewType.PERFORMANCE,
    filters: [{ column: 'dv', filter: 'mobile', isExclusive: false }],
    customEvents: [],
  },
]

@Injectable()
export class DemoDataService implements OnModuleInit {
  private readonly logger = new Logger(DemoDataService.name)

  constructor(
    @InjectRepository(Annotation)
    private readonly annotationRepository: Repository<Annotation>,
    @InjectRepository(Experiment)
    private readonly experimentRepository: Repository<Experiment>,
    @InjectRepository(ExperimentVariant)
    private readonly experimentVariantRepository: Repository<ExperimentVariant>,
    @InjectRepository(FeatureFlag)
    private readonly featureFlagRepository: Repository<FeatureFlag>,
    @InjectRepository(Funnel)
    private readonly funnelRepository: Repository<Funnel>,
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectViewCustomEventEntity)
    private readonly projectViewCustomEventRepository: Repository<ProjectViewCustomEventEntity>,
    @InjectRepository(ProjectViewEntity)
    private readonly projectViewRepository: Repository<ProjectViewEntity>,
    private readonly sessionReplayStorage: SessionReplayS3Service,
  ) {}

  onModuleInit() {
    if (this.isEnabled()) {
      void this.generateDemoData('startup')
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    await this.generateDemoData('cron')
  }

  async generateDemoData(source: 'startup' | 'cron' | 'manual' = 'manual') {
    if (!this.isEnabled()) {
      return
    }

    const token = randomUUID()
    let hasLock = false
    let lockHeartbeat: ReturnType<typeof setInterval> | undefined

    try {
      const lockResult = await redis.set(
        LOCK_KEY,
        token,
        'EX',
        LOCK_TTL_SECONDS,
        'NX',
      )

      if (lockResult !== 'OK') {
        return
      }

      hasLock = true
      lockHeartbeat = this.startLockHeartbeat(token)

      const project = await this.getDemoProject()

      if (!project) {
        this.logger.log(
          `Demo project ${DEMO_PROJECT_ID} does not exist, skipping demo data generation`,
        )
        return
      }

      const config = await this.ensureDemoConfig(project)
      const { from, to, initial } = await this.getGenerationWindow()

      if (!to.isAfter(from)) {
        return
      }

      const rows = await this.generateRows(from, to, config, initial)
      await this.insertRows(rows)

      if (rows.revenue.length > 0) {
        await this.projectRepository.update(DEMO_PROJECT_ID, {
          revenueLastSyncAt: to.toDate(),
        })
      }

      await redis.set(LAST_GENERATED_AT_KEY, to.toISOString())

      this.logger.log(
        `Generated demo data from ${from.toISOString()} to ${to.toISOString()} via ${source}`,
      )
    } catch (reason) {
      this.logger.error(
        'Unable to generate demo data',
        reason instanceof Error ? reason.stack : String(reason),
      )
    } finally {
      if (lockHeartbeat) {
        clearInterval(lockHeartbeat)
      }

      if (hasLock) {
        await this.releaseLock(token)
      }
    }
  }

  private isEnabled() {
    return process.env.DEMO_DATA_ENABLED === 'true'
  }

  private async getDemoProject() {
    const project = await this.projectRepository.findOne({
      where: { id: DEMO_PROJECT_ID },
    })

    if (!project) {
      return null
    }

    if (!project.revenueApiEnabled || project.revenueCurrency !== 'USD') {
      project.revenueApiEnabled = true
      project.revenueCurrency = 'USD'
      project.revenueLastSyncAt = new Date()

      return this.projectRepository.save(project)
    }

    return project
  }

  private async ensureDemoConfig(project: Project): Promise<DemoConfig> {
    const goals = await this.upsertGoals(project)
    await this.upsertFunnels(project)
    await this.upsertAnnotations(project)
    await this.upsertViews(project)
    const flags = await this.upsertFeatureFlags(project)
    const experiments = await this.upsertExperiments(project, goals, flags)

    return { goals, flags, experiments }
  }

  private async upsertGoals(project: Project) {
    const goals: Record<string, Goal> = {}

    for (const seed of GOAL_SEEDS) {
      let goal = await this.goalRepository.findOne({
        where: {
          name: seed.name,
          project: { id: DEMO_PROJECT_ID },
        } as any,
      })

      const data: Partial<Goal> = {
        name: seed.name,
        type: seed.type,
        matchType: GoalMatchType.EXACT,
        value: seed.value,
        metadataFilters: null,
        conditions: null,
        active: true,
        project,
      }

      if (goal) {
        Object.assign(goal, data)
      } else {
        goal = this.goalRepository.create(data)
      }

      goals[seed.key] = await this.goalRepository.save(goal)
    }

    return goals
  }

  private async upsertFunnels(project: Project) {
    for (const seed of FUNNEL_SEEDS) {
      let funnel = await this.funnelRepository.findOne({
        where: {
          name: seed.name,
          project: { id: DEMO_PROJECT_ID },
        } as any,
      })

      const data: Partial<Funnel> = {
        name: seed.name,
        steps: seed.steps,
        project,
      }

      if (funnel) {
        Object.assign(funnel, data)
      } else {
        funnel = this.funnelRepository.create(data)
      }

      await this.funnelRepository.save(funnel)
    }
  }

  private async upsertAnnotations(project: Project) {
    const today = dayjs.utc().startOf('day')
    const annotations = [
      {
        date: today.subtract(70, 'day').toDate(),
        text: 'Public demo launched',
      },
      {
        date: today.subtract(45, 'day').toDate(),
        text: 'Pricing page copy updated',
      },
      {
        date: today.subtract(21, 'day').toDate(),
        text: 'Session replay onboarding experiment started',
      },
      {
        date: today.subtract(9, 'day').toDate(),
        text: 'Docs search feature flag rolled out',
      },
    ]

    for (const seed of annotations) {
      let annotation = await this.annotationRepository.findOne({
        where: {
          text: seed.text,
          project: { id: DEMO_PROJECT_ID },
        } as any,
      })

      const data: Partial<Annotation> = {
        date: seed.date,
        text: seed.text,
        project,
      }

      if (annotation) {
        Object.assign(annotation, data)
      } else {
        annotation = this.annotationRepository.create(data)
      }

      await this.annotationRepository.save(annotation)
    }
  }

  private async upsertViews(project: Project) {
    for (const seed of VIEW_SEEDS) {
      let view = await this.projectViewRepository.findOne({
        where: { projectId: DEMO_PROJECT_ID, name: seed.name },
      })

      const data: Partial<ProjectViewEntity> = {
        projectId: DEMO_PROJECT_ID,
        name: seed.name,
        type: seed.type,
        filters: JSON.stringify(seed.filters),
        project,
      }

      if (view) {
        Object.assign(view, data)
      } else {
        view = this.projectViewRepository.create(data)
      }

      const saved = await this.projectViewRepository.save(view)
      await this.projectViewCustomEventRepository.delete({ viewId: saved.id })

      for (const customEvent of seed.customEvents) {
        await this.projectViewCustomEventRepository.save(
          this.projectViewCustomEventRepository.create({
            viewId: saved.id,
            view: saved,
            ...customEvent,
          }),
        )
      }
    }
  }

  private async upsertFeatureFlags(project: Project) {
    const flags: Record<string, FeatureFlag> = {}

    for (const seed of FLAG_SEEDS) {
      let flag = await this.featureFlagRepository.findOne({
        where: {
          key: seed.key,
          project: { id: DEMO_PROJECT_ID },
        } as any,
      })

      const data: Partial<FeatureFlag> = {
        key: seed.key,
        description: seed.description,
        flagType: FeatureFlagType.BOOLEAN,
        rolloutPercentage: seed.rolloutPercentage,
        targetingRules: [
          {
            id: `${seed.key}-demo-country`,
            field: 'country',
            operator: 'in',
            value: ['US', 'GB', 'DE', 'NL', 'CA'],
          },
        ] as any,
        scheduledChange: null,
        killSwitchActive: false,
        killSwitchValue: false,
        killedAt: null,
        targetingUpdatedAt: null,
        enabled: true,
        project,
      }

      if (flag) {
        Object.assign(flag, data)
      } else {
        flag = this.featureFlagRepository.create(data)
      }

      flags[seed.key] = await this.featureFlagRepository.save(flag)
    }

    return flags
  }

  private async upsertExperiments(
    project: Project,
    goals: Record<string, Goal>,
    flags: Record<string, FeatureFlag>,
  ) {
    const experiments: Record<string, Experiment> = {}

    for (const seed of EXPERIMENT_SEEDS) {
      let experiment = await this.experimentRepository.findOne({
        where: {
          name: seed.name,
          project: { id: DEMO_PROJECT_ID },
        } as any,
        relations: ['variants'],
      })

      const flag = flags[seed.featureFlagKey]
      const data: Partial<Experiment> = {
        name: seed.name,
        description: seed.description,
        hypothesis: seed.hypothesis,
        status: ExperimentStatus.RUNNING,
        exposureTrigger: ExposureTrigger.FEATURE_FLAG,
        customEventName: null,
        multipleVariantHandling: MultipleVariantHandling.FIRST_EXPOSURE,
        filterInternalUsers: false,
        featureFlagMode: FeatureFlagMode.LINK,
        featureFlagKey: seed.featureFlagKey,
        startedAt: dayjs.utc().subtract(60, 'day').toDate(),
        endedAt: null,
        project,
        featureFlag: flag,
        goal: goals[seed.goalKey],
      }

      if (experiment) {
        Object.assign(experiment, data)
      } else {
        experiment = this.experimentRepository.create(data)
      }

      const saved = await this.experimentRepository.save(experiment)
      const variants = await this.experimentVariantRepository.find({
        where: { experiment: { id: saved.id } } as any,
      })

      for (const seedVariant of seed.variants) {
        let variant = variants.find((item) => item.key === seedVariant.key)

        const variantData: Partial<ExperimentVariant> = {
          name: seedVariant.name,
          key: seedVariant.key,
          description: null,
          rolloutPercentage: seedVariant.rolloutPercentage,
          isControl: seedVariant.isControl,
          experiment: saved,
        }

        if (variant) {
          Object.assign(variant, variantData)
        } else {
          variant = this.experimentVariantRepository.create(variantData)
        }

        await this.experimentVariantRepository.save(variant)
      }

      const staleVariants = variants.filter(
        (variant) =>
          !seed.variants.some((seedVariant) => seedVariant.key === variant.key),
      )

      if (staleVariants.length > 0) {
        await this.experimentVariantRepository.remove(staleVariants)
      }

      flag.experimentId = saved.id
      await this.featureFlagRepository.save(flag)

      saved.variants = await this.experimentVariantRepository.find({
        where: { experiment: { id: saved.id } } as any,
      })
      experiments[seed.key] = saved
    }

    return experiments
  }

  private async getGenerationWindow() {
    const now = dayjs.utc()
    const marker = await redis.get(LAST_GENERATED_AT_KEY)
    const lastGenerated = marker ? dayjs.utc(marker) : null
    const hasMarker = Boolean(lastGenerated?.isValid())
    const from = hasMarker
      ? lastGenerated.add(1, 'second')
      : now.subtract(BACKFILL_DAYS, 'day').startOf('day')

    return {
      from,
      to: now,
      initial: !hasMarker,
    }
  }

  private async generateRows(
    from: Dayjs,
    to: Dayjs,
    config: DemoConfig,
    initial: boolean,
  ): Promise<DemoRows> {
    const random = createRandom(`${from.toISOString()}:${to.toISOString()}`)
    const replayTemplates = await this.getReplayTemplates()
    const rows: DemoRows = {
      events: [],
      sessions: [],
      featureFlagEvaluations: [],
      experimentExposures: [],
      replayChunks: [],
      revenue: [],
    }
    const hours = Math.max(1, to.diff(from, 'hour', true))
    const sessionCount = initial
      ? Math.min(14000, Math.max(900, Math.round(hours * 6.2)))
      : Math.min(180, Math.max(28, Math.round(hours * 48)))
    const returningProfilePool = Array.from({ length: 520 }, (_, index) =>
      this.profileId(`demo-returning-profile-${index}`, index % 3 !== 0),
    )

    for (let index = 0; index < sessionCount; index += 1) {
      const geo = pickWeighted(
        GEO_POOL.map((value) => ({ value, weight: value.weight })),
        random,
      )
      const session = this.buildSession(
        index,
        from,
        to,
        geo,
        returningProfilePool,
        config,
        random,
      )

      this.appendSessionRows(rows, session, config, replayTemplates, random)
    }

    rows.events.sort((left, right) =>
      String(left.created).localeCompare(String(right.created)),
    )
    rows.sessions.sort((left, right) =>
      String(left.firstSeen).localeCompare(String(right.firstSeen)),
    )
    rows.featureFlagEvaluations.sort((left, right) =>
      String(left.created).localeCompare(String(right.created)),
    )
    rows.experimentExposures.sort((left, right) =>
      String(left.created).localeCompare(String(right.created)),
    )
    rows.replayChunks.sort((left, right) =>
      left.firstEventTimestamp - right.firstEventTimestamp,
    )

    return rows
  }

  private buildSession(
    index: number,
    from: Dayjs,
    to: Dayjs,
    geo: Geo,
    returningProfilePool: string[],
    config: DemoConfig,
    random: DemoRandom,
  ): SessionContext {
    const source = pickWeighted(
      TRAFFIC_SOURCES.map((value) => ({ value, weight: value.weight })),
      random,
    )
    const returning = random() < 0.28
    const entryPage = pickWeighted(source.entryPages, random)
    const client = this.pickClient(geo, random)
    const start = this.pickBiasedTime(from, to, geo, source, random)
    const identifiedSeed = `${start.toISOString()}:${index}:${source.name}`
    const profileId = returning
      ? returningProfilePool[
          intBetween(0, returningProfilePool.length - 1, random)
        ]
      : this.profileId(identifiedSeed, false)
    const variantKeys = this.pickExperimentVariants(config, profileId)
    const journey = this.buildJourney(
      entryPage,
      returning,
      source,
      client,
      variantKeys,
      random,
    )
    const identified =
      returning ||
      journey.customEvents.some((event) =>
        ['Signup', 'Trial Started', 'Sale', 'Upgrade'].includes(event.name),
      )

    return {
      psid: this.sessionId(`${profileId}:${start.toISOString()}:${index}`),
      profileId: identified ? profileId.replace('anon_', 'usr_') : profileId,
      returning,
      identified,
      start,
      geo,
      source,
      client,
      pages: journey.pages,
      customEvents: journey.customEvents,
      variantKeys,
    }
  }

  private buildJourney(
    entryPage: string,
    returning: boolean,
    source: TrafficSource,
    client: ClientProfile,
    variantKeys: Record<string, string>,
    random: DemoRandom,
  ) {
    const pages = [entryPage]
    const customEvents: JourneyEvent[] = []
    const signupLift = variantKeys['onboarding-flow'] === 'guided' ? 0.12 : 0
    const saleLift = variantKeys['pricing-copy'] === 'social-proof' ? 0.08 : 0
    const mobilePenalty = client.dv === 'mobile' ? 0.08 : 0
    const baseSignupRate =
      (returning ? 0.3 : 0.16) * source.conversionBias +
      signupLift -
      mobilePenalty
    const hasPricingIntent =
      entryPage === '/pricing' ||
      entryPage === '/alternatives/google-analytics' ||
      source.me === 'cpc' ||
      source.name === 'Capterra'
    const viewedPricing =
      hasPricingIntent || random() < (returning ? 0.42 : 0.31)

    if (viewedPricing && !pages.includes('/pricing')) {
      pages.push('/pricing')
    }

    if (random() < 0.28) {
      pages.push(
        pickWeighted(
          [
            { weight: 35, value: '/features/session-replays' },
            { weight: 25, value: '/features/errors' },
            { weight: 22, value: '/docs' },
            {
              weight: 18,
              value: BLOG_PAGES[intBetween(0, BLOG_PAGES.length - 1, random)],
            },
          ],
          random,
        ),
      )
    }

    const newsletterSignup = random() < 0.1
    if (newsletterSignup) {
      customEvents.push({
        name: 'Newsletter Signup',
        page: pages[pages.length - 1],
        offsetSeconds: intBetween(12, 70, random),
        meta: { source: source.so || 'direct' },
      })
    }

    const signedUp = random() < clamp(baseSignupRate, 0.05, 0.62)

    if (signedUp) {
      if (!pages.includes('/signup')) {
        pages.push('/signup')
      }

      customEvents.push({
        name: 'Signup',
        page: '/signup',
        offsetSeconds: intBetween(8, 42, random),
        meta: {
          plan: viewedPricing ? 'trial' : 'free',
          source: source.so || 'direct',
        },
      })

      if (
        random() < (variantKeys['onboarding-flow'] === 'guided' ? 0.78 : 0.65)
      ) {
        pages.push('/dashboard')
        customEvents.push({
          name: 'Trial Started',
          page: '/dashboard',
          offsetSeconds: intBetween(12, 66, random),
          meta: { checklist: variantKeys['onboarding-flow'] },
        })
      }
    }

    const checkoutIntent =
      signedUp &&
      viewedPricing &&
      random() <
        clamp(
          (returning ? 0.38 : 0.22) * source.conversionBias +
            saleLift -
            mobilePenalty,
          0.05,
          0.72,
        )

    if (checkoutIntent) {
      pages.push('/checkout')
      customEvents.push({
        name: 'Checkout Started',
        page: '/checkout',
        offsetSeconds: intBetween(6, 30, random),
        meta: {
          plan: random() < 0.64 ? '1m' : '500k',
          billing: random() < 0.58 ? 'yearly' : 'monthly',
        },
      })

      if (
        random() <
        clamp(0.48 + saleLift + source.conversionBias / 10, 0.22, 0.82)
      ) {
        pages.push('/thank-you')
        customEvents.push({
          name: 'Sale',
          page: '/thank-you',
          offsetSeconds: intBetween(4, 24, random),
          meta: {
            currency: 'USD',
            amount: random() < 0.58 ? '190' : '29',
            plan: random() < 0.58 ? '1m-yearly' : '500k-monthly',
          },
        })
      }
    }

    if (returning && random() < 0.18) {
      pages.push('/settings/billing')
      customEvents.push({
        name: 'Upgrade',
        page: '/settings/billing',
        offsetSeconds: intBetween(20, 90, random),
        meta: {
          from_plan: '500k',
          to_plan: '1m',
          currency: 'USD',
          amount: '161',
        },
      })
    }

    if (returning && random() < 0.018) {
      customEvents.push({
        name: 'Refund',
        page: pages[pages.length - 1],
        offsetSeconds: intBetween(30, 120, random),
        meta: {
          currency: 'USD',
          amount: '29',
          reason: random() < 0.5 ? 'duplicate_payment' : 'changed_mind',
        },
      })
    }

    if (pages.length === 1 && random() < 0.38) {
      pages.push(random() < 0.5 ? '/pricing' : '/docs')
    }

    return { pages, customEvents }
  }

  private appendSessionRows(
    rows: DemoRows,
    session: SessionContext,
    config: DemoConfig,
    replayTemplates: DemoReplayTemplate[],
    random: DemoRandom,
  ) {
    let current = session.start
    const pageTimes = new Map<string, Dayjs>()

    session.pages.forEach((page, index) => {
      if (index > 0) {
        current = current.add(intBetween(18, 135, random), 'second')
      }

      pageTimes.set(page, current)
      rows.events.push(this.pageviewEvent(session, page, current))

      if (random() < 0.86) {
        rows.events.push(
          this.performanceEvent(
            session,
            page,
            current.add(1, 'second'),
            random,
          ),
        )
      }
    })

    for (const customEvent of session.customEvents) {
      const baseTime =
        pageTimes.get(customEvent.page) ||
        pageTimes.get(session.pages[session.pages.length - 1]) ||
        session.start
      const created = baseTime.add(customEvent.offsetSeconds, 'second')
      rows.events.push(
        this.customEvent(
          session,
          customEvent.name,
          customEvent.page,
          created,
          customEvent.meta,
        ),
      )
      this.appendRevenueRow(rows, session, customEvent, created)
    }

    this.appendErrorRows(rows, session, pageTimes, random)
    this.appendCaptchaRows(rows, session, pageTimes, random)
    this.appendFeatureFlagRows(rows, session, config)
    this.appendExperimentRows(rows, session, config)
    this.appendReplayRows(rows, session, replayTemplates, random)

    const seenTimestamps = Array.from(pageTimes.values())
      .concat(
        session.customEvents.map((event) =>
          (pageTimes.get(event.page) || session.start).add(
            event.offsetSeconds,
            'second',
          ),
        ),
      )
      .sort((left, right) => left.valueOf() - right.valueOf())
    const lastSeen = seenTimestamps[seenTimestamps.length - 1] || session.start

    rows.sessions.push({
      psid: session.psid,
      pid: DEMO_PROJECT_ID,
      profileId: session.profileId,
      firstSeen: this.format(session.start),
      lastSeen: this.format(lastSeen.add(intBetween(2, 48, random), 'second')),
      pageviews: session.pages.length,
      events: session.customEvents.length,
    })
  }

  private pageviewEvent(session: SessionContext, page: string, created: Dayjs) {
    return {
      ...eventTransformer({
        type: 'pageview',
        ...this.commonEvent(session, page),
      }),
      created: this.format(created),
    }
  }

  private performanceEvent(
    session: SessionContext,
    page: string,
    created: Dayjs,
    random: DemoRandom,
  ) {
    const mobileMultiplier = session.client.dv === 'mobile' ? 1.28 : 1
    const overseasMultiplier = ['IN', 'JP', 'AU', 'BR'].includes(session.geo.cc)
      ? 1.18
      : 1
    const sourceMultiplier = session.source.me === 'cpc' ? 0.92 : 1
    const multiplier = mobileMultiplier * overseasMultiplier * sourceMultiplier
    const dns = intBetween(5, 36, random) * multiplier
    const tls = intBetween(18, 85, random) * multiplier
    const conn = intBetween(18, 92, random) * multiplier
    const response = intBetween(95, 390, random) * multiplier
    const render = intBetween(180, 1250, random) * multiplier
    const domLoad = response + render + intBetween(80, 320, random)
    const pageLoad = domLoad + intBetween(120, 900, random)

    return {
      ...eventTransformer({
        type: 'performance',
        pid: DEMO_PROJECT_ID,
        psid: session.psid,
        profileId: session.profileId,
        host: DEMO_HOST,
        pg: page,
        dv: session.client.dv,
        br: session.client.br,
        brv: session.client.brv,
        cc: session.geo.cc,
        rg: session.geo.region,
        rgc: session.geo.rgc,
        ct: session.geo.city,
        isp: session.geo.isp,
        og: session.source.name,
        ut: session.source.me,
        ctp: session.source.ca,
        dns,
        tls,
        conn,
        response,
        render,
        domLoad,
        pageLoad,
        ttfb: response + intBetween(20, 120, random),
      }),
      created: this.format(created),
    }
  }

  private customEvent(
    session: SessionContext,
    name: string,
    page: string,
    created: Dayjs,
    meta: Record<string, string>,
  ) {
    return {
      ...eventTransformer({
        type: 'custom_event',
        ...this.commonEvent(session, page),
        ev: name,
        meta: {
          ...meta,
          returning: String(session.returning),
          experiment_onboarding: session.variantKeys['onboarding-flow'],
          experiment_pricing: session.variantKeys['pricing-copy'],
        },
      }),
      created: this.format(created),
    }
  }

  private appendRevenueRow(
    rows: DemoRows,
    session: SessionContext,
    event: JourneyEvent,
    created: Dayjs,
  ) {
    if (!['Sale', 'Upgrade', 'Refund'].includes(event.name)) {
      return
    }

    const amount = Number(event.meta.amount || 0)

    if (!Number.isFinite(amount) || amount <= 0) {
      return
    }

    const isRefund = event.name === 'Refund'
    const isSubscription = event.name === 'Upgrade'
    const productName = isRefund
      ? 'Refund'
      : event.meta.plan
        ? `${event.meta.plan} plan`
        : 'Swetrix subscription'
    const type = isRefund ? 'refund' : isSubscription ? 'subscription' : 'sale'
    const signedAmount = isRefund ? -Math.abs(amount) : amount
    const transactionId = [
      'demo',
      type,
      this.hashHex(
        `${session.psid}:${event.name}:${created.toISOString()}`,
      ).slice(0, 18),
    ].join('_')
    const providerSeed = percentHash(`${session.profileId}:${transactionId}`)
    const provider =
      providerSeed < 58 ? 'api' : providerSeed < 82 ? 'stripe' : 'paddle'

    rows.revenue.push({
      pid: DEMO_PROJECT_ID,
      transaction_id: transactionId,
      provider,
      type,
      status: isRefund ? 'refunded' : 'completed',
      amount: signedAmount,
      original_amount: signedAmount,
      original_currency: event.meta.currency || 'USD',
      currency: 'USD',
      profile_id: session.profileId,
      session_id: session.psid,
      product_id: isRefund
        ? 'refund'
        : isSubscription
          ? 'plan-upgrade'
          : `plan-${event.meta.plan || 'starter'}`,
      product_name: productName,
      metadata: JSON.stringify({
        source: session.source.so || 'direct',
        medium: session.source.me || 'direct',
        campaign: session.source.ca || '',
        country: session.geo.cc,
        page: event.page,
        demo: true,
      }),
      created: this.format(created),
      synced_at: this.format(created.add(30, 'second')),
    })
  }

  private appendErrorRows(
    rows: DemoRows,
    session: SessionContext,
    pageTimes: Map<string, Dayjs>,
    random: DemoRandom,
  ) {
    const errorProbability =
      session.client.dv === 'mobile' ? 0.055 : session.returning ? 0.028 : 0.04

    if (random() > errorProbability) {
      return
    }

    const template = pickWeighted(
      ERROR_TEMPLATES.map((value, index) => ({
        value,
        weight: index === 0 ? 7 : index === 1 ? 6 : 4,
      })),
      random,
    )
    const page = session.pages[intBetween(0, session.pages.length - 1, random)]
    const created = (pageTimes.get(page) || session.start).add(
      intBetween(4, 110, random),
      'second',
    )
    const eid = this.errorId(template)

    rows.events.push({
      ...eventTransformer({
        type: 'error',
        ...this.commonEvent(session, page),
        eid,
        name: template.name,
        message: template.message,
        filename: template.filename,
        lineno: template.lineno,
        colno: template.colno,
        stackTrace: template.stack.join('\n'),
        meta: {
          release: 'demo-2026.06',
          build_id: 'web-demo-7f3a',
        },
      }),
      created: this.format(created),
    })
  }

  private appendCaptchaRows(
    rows: DemoRows,
    session: SessionContext,
    pageTimes: Map<string, Dayjs>,
    random: DemoRandom,
  ) {
    const requiresCaptcha =
      session.pages.includes('/signup') ||
      session.pages.includes('/checkout') ||
      session.source.me === 'cpc'

    if (!requiresCaptcha || random() > 0.72) {
      return
    }

    const page = session.pages.includes('/checkout') ? '/checkout' : '/signup'
    const created = (pageTimes.get(page) || session.start).add(2, 'second')
    const reason =
      session.source.me === 'cpc'
        ? 'paid_traffic'
        : session.client.dv === 'mobile'
          ? 'device_velocity'
          : random() < 0.18
            ? 'suspicious_velocity'
            : 'baseline'
    const difficulty = reason === 'baseline' ? 4 : random() < 0.55 ? 5 : 6
    const mode = reason === 'baseline' ? 'manual' : 'auto'

    rows.events.push(
      this.captchaEvent(
        session,
        'generate',
        created,
        difficulty,
        mode,
        reason,
        0,
      ),
    )

    const solveMs = intBetween(650, difficulty * 920, random)
    const passed = random() > (difficulty > 5 ? 0.2 : 0.08)

    rows.events.push(
      this.captchaEvent(
        session,
        passed ? 'pass' : random() < 0.5 ? 'verify_fail' : 'validation_fail',
        created.add(intBetween(1, 7, random), 'second'),
        difficulty,
        mode,
        reason,
        passed ? solveMs : 0,
      ),
    )

    if (!passed && random() < 0.18) {
      rows.events.push(
        this.captchaEvent(
          session,
          'replay',
          created.add(intBetween(8, 20, random), 'second'),
          difficulty,
          mode,
          'spent_challenge',
          0,
        ),
      )
    }
  }

  private captchaEvent(
    session: SessionContext,
    captchaEvent: string,
    created: Dayjs,
    difficulty: number,
    mode: string,
    reason: string,
    solveMs: number,
  ) {
    return {
      ...eventTransformer({
        type: 'captcha',
        pid: DEMO_PROJECT_ID,
        dv: session.client.dv,
        br: session.client.br,
        os: session.client.os,
        cc: session.geo.cc,
        meta: {
          captcha_event: captchaEvent,
          captcha_difficulty: String(difficulty),
          captcha_difficulty_mode: mode,
          captcha_reason: reason,
          solve_ms: String(solveMs),
        },
        timestamp: created.valueOf(),
      }),
      psid: session.psid,
      profileId: session.profileId,
      host: DEMO_HOST,
      pg: session.pages.includes('/checkout') ? '/checkout' : '/signup',
      brv: session.client.brv,
      rg: session.geo.region,
      rgc: session.geo.rgc,
      ct: session.geo.city,
      isp: session.geo.isp,
      created: this.format(created),
    }
  }

  private appendFeatureFlagRows(
    rows: DemoRows,
    session: SessionContext,
    config: DemoConfig,
  ) {
    for (const flag of Object.values(config.flags)) {
      const result =
        percentHash(`${session.profileId}:${flag.key}`) <
        (flag.rolloutPercentage || 0)

      rows.featureFlagEvaluations.push({
        pid: DEMO_PROJECT_ID,
        flagId: flag.id,
        flagKey: flag.key,
        result: result ? 1 : 0,
        profileId: session.profileId,
        created: this.format(session.start.add(2, 'second')),
      })
    }
  }

  private appendExperimentRows(
    rows: DemoRows,
    session: SessionContext,
    config: DemoConfig,
  ) {
    for (const [key, experiment] of Object.entries(config.experiments)) {
      rows.experimentExposures.push({
        pid: DEMO_PROJECT_ID,
        experimentId: experiment.id,
        variantKey: session.variantKeys[key],
        profileId: session.profileId,
        created: this.format(session.start.add(3, 'second')),
      })
    }
  }

  private appendReplayRows(
    rows: DemoRows,
    session: SessionContext,
    replayTemplates: DemoReplayTemplate[],
    random: DemoRandom,
  ) {
    if (
      replayTemplates.length === 0 ||
      session.pages.length < 2 ||
      random() > (session.returning ? 0.28 : 0.16)
    ) {
      return
    }

    const replayTemplate =
      replayTemplates[
        percentHash(`${session.psid}:${session.profileId}`) %
          replayTemplates.length
      ]
    const firstEventTimestamp = session.start.add(1, 'second')
    const lastEventTimestamp = session.start.add(
      Math.max(35, session.pages.length * 45 + intBetween(15, 80, random)),
      'second',
    )
    const replayDurationMs = Math.max(
      1000,
      lastEventTimestamp.diff(firstEventTimestamp),
    )
    const chunkDurationMs = Math.max(
      1000,
      Math.floor(replayDurationMs / replayTemplate.chunks.length),
    )
    const replayId = this.hashHex(`${session.psid}:replay`).slice(0, 32)

    replayTemplate.chunks.forEach((chunk, index) => {
      const chunkFirstEventTimestamp = firstEventTimestamp.add(
        chunkDurationMs * index,
        'millisecond',
      )
      const chunkLastEventTimestamp =
        index === replayTemplate.chunks.length - 1
          ? lastEventTimestamp
          : firstEventTimestamp
              .add(chunkDurationMs * (index + 1), 'millisecond')
              .subtract(1, 'millisecond')

      rows.replayChunks.push({
        pid: DEMO_PROJECT_ID,
        psid: session.psid,
        replayId,
        chunkIndex: chunk.chunkIndex,
        objectKey: chunk.objectKey,
        privacyMode: 'mask-inputs',
        eventCount: intBetween(60, 360, random),
        uncompressedBytes: intBetween(24000, 360000, random),
        compressedBytes: intBetween(900, 95000, random),
        firstEventTimestamp: chunkFirstEventTimestamp.valueOf(),
        lastEventTimestamp: chunkLastEventTimestamp.valueOf(),
        created: this.format(chunkLastEventTimestamp),
        expiresAt: this.format(dayjs.utc().add(10, 'year')),
      })
    })
  }

  private commonEvent(session: SessionContext, page: string) {
    const isPaid = session.source.me === 'cpc'

    return {
      pid: DEMO_PROJECT_ID,
      psid: session.psid,
      profileId: session.profileId,
      host: DEMO_HOST,
      pg: page,
      dv: session.client.dv,
      br: session.client.br,
      brv: session.client.brv,
      os: session.client.os,
      osv: session.client.osv,
      lc: session.geo.locale,
      ref: session.source.ref,
      so: session.source.so,
      me: session.source.me,
      ca: session.source.ca,
      te: isPaid ? 'privacy analytics software' : null,
      co: isPaid ? 'demo-ad' : null,
      cc: session.geo.cc,
      rg: session.geo.region,
      rgc: session.geo.rgc,
      ct: session.geo.city,
      isp: session.geo.isp,
      og: session.source.name,
      ut: session.source.me,
      ctp: session.source.ca,
      meta: {
        returning: String(session.returning),
        identified: String(session.identified),
      },
    }
  }

  private pickClient(geo: Geo, random: DemoRandom) {
    const mobileShare = ['IN', 'BR', 'JP'].includes(geo.cc)
      ? 0.56
      : ['US', 'GB', 'DE', 'NL', 'CA'].includes(geo.cc)
        ? 0.34
        : 0.42

    return pickWeighted(
      random() < mobileShare ? MOBILE_CLIENTS : DESKTOP_CLIENTS,
      random,
    )
  }

  private pickExperimentVariants(config: DemoConfig, profileId: string) {
    const variants: Record<string, string> = {}

    for (const [key, experiment] of Object.entries(config.experiments)) {
      const seededPercent = percentHash(`${key}:${profileId}`)
      const sortedVariants = [...(experiment.variants || [])].sort(
        (left, right) => left.key.localeCompare(right.key),
      )
      let cursor = 0
      let selected = sortedVariants[0]?.key || 'control'

      for (const variant of sortedVariants) {
        cursor += variant.rolloutPercentage

        if (seededPercent < cursor) {
          selected = variant.key
          break
        }
      }

      variants[key] = selected
    }

    return variants
  }

  private pickBiasedTime(
    from: Dayjs,
    to: Dayjs,
    geo: Geo,
    source: TrafficSource,
    random: DemoRandom,
  ) {
    const spanMs = Math.max(1, to.valueOf() - from.valueOf())

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const candidate = dayjs.utc(
        from.valueOf() + Math.floor(random() * spanMs),
      )
      const local = candidate.add(geo.utcOffset * 60, 'minute')
      const hour = local.hour()
      const weekday = local.day()
      const businessHourBoost = hour >= 8 && hour <= 18 ? 0.72 : 0.25
      const eveningBoost = hour >= 19 && hour <= 22 ? 0.44 : 0.16
      const weekdayBoost = weekday >= 1 && weekday <= 5 ? 1 : 0.62
      const sourceBoost =
        source.name === 'Y Combinator' && hour >= 16
          ? 1.18
          : source.me === 'email' && hour >= 8 && hour <= 11
            ? 1.16
            : 1
      const probability = Math.min(
        0.96,
        (businessHourBoost + eveningBoost) * weekdayBoost * sourceBoost,
      )

      if (random() < probability) {
        return candidate
      }
    }

    return dayjs.utc(from.valueOf() + Math.floor(random() * spanMs))
  }

  private sessionId(seed: string) {
    const bigint = BigInt(`0x${this.hashHex(seed).slice(0, 15)}`)
    return bigint.toString()
  }

  private profileId(seed: string, identified: boolean) {
    return `${identified ? 'usr' : 'anon'}_${this.hashHex(seed).slice(0, 24)}`
  }

  private errorId(template: ErrorTemplate) {
    return this.hashHex(
      `${template.name}:${template.message}:${template.filename}`,
    ).slice(0, 32)
  }

  private hashHex(seed: string) {
    return createHash('sha256').update(seed).digest('hex')
  }

  private format(value: Dayjs) {
    return value.utc().format('YYYY-MM-DD HH:mm:ss')
  }

  private async getReplayTemplates(): Promise<DemoReplayTemplate[]> {
    const groups = new Map<string, DemoReplayTemplate>()
    const prefix = (process.env.DEMO_REPLAY_OBJECT_PREFIX || '')
      .trim()
      .replace(/^\/+|\/+$/g, '')

    if (!prefix || !this.sessionReplayStorage.isConfigured()) {
      return []
    }

    let keys: string[]

    try {
      keys = await this.sessionReplayStorage.listObjects(`${prefix}/`)
    } catch (reason) {
      this.logger.warn(
        `Unable to list demo replay prefix ${prefix}: ${
          reason instanceof Error ? reason.message : String(reason)
        }`,
      )
      return []
    }

    for (const objectKey of keys) {
      const match = objectKey.match(/^(.*)\/(\d+)\.json\.gz$/)

      if (!match) {
        continue
      }

      const id = match[1]
      const chunkIndex = Number(match[2])
      const group = groups.get(id) || { id, chunks: [] }

      group.chunks.push({ chunkIndex, objectKey })
      groups.set(id, group)
    }

    const templates = Array.from(groups.values())
      .filter((template) => template.chunks.length > 0)
      .map((template) => ({
        ...template,
        chunks: template.chunks.sort(
          (left, right) => left.chunkIndex - right.chunkIndex,
        ),
      }))
      .sort((left, right) => left.id.localeCompare(right.id))

    this.logger.log(
      `Loaded ${templates.length} demo replay templates from ${prefix} with ${templates.reduce(
        (sum, template) => sum + template.chunks.length,
        0,
      )} chunks`,
    )

    return templates
  }

  private async insertRows(rows: DemoRows) {
    await this.insertBatches('events', rows.events)
    await this.insertBatches('sessions', rows.sessions)
    await this.insertBatches(
      'feature_flag_evaluations',
      rows.featureFlagEvaluations,
    )
    await this.insertBatches('experiment_exposures', rows.experimentExposures)
    await this.insertBatches('session_replay_chunks', rows.replayChunks)
    await this.insertBatches('revenue', rows.revenue)
  }

  private async insertBatches(table: string, values: any[]) {
    if (values.length === 0) {
      return
    }

    for (let index = 0; index < values.length; index += 5000) {
      await clickhouse.insert({
        table,
        values: values.slice(index, index + 5000),
        format: 'JSONEachRow',
      })
    }
  }

  private startLockHeartbeat(token: string) {
    return setInterval(() => {
      void this.refreshLock(token)
    }, LOCK_RENEW_INTERVAL_MS)
  }

  private async refreshLock(token: string) {
    try {
      const renewed = await redis.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('EXPIRE', KEYS[1], ARGV[2]) else return 0 end",
        1,
        LOCK_KEY,
        token,
        LOCK_TTL_SECONDS,
      )

      if (Number(renewed) !== 1) {
        this.logger.warn('Demo data lock is no longer owned by this process')
      }
    } catch (reason) {
      this.logger.warn(`Unable to refresh demo data lock: ${reason}`)
    }
  }

  private async releaseLock(token: string) {
    try {
      await redis.eval(
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
        1,
        LOCK_KEY,
        token,
      )
    } catch (reason) {
      this.logger.warn(`Unable to release demo data lock: ${reason}`)
    }
  }
}

const createRandom = (seed: string): DemoRandom => {
  let state = parseInt(
    createHash('sha256').update(seed).digest('hex').slice(0, 8),
    16,
  )

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

const pickWeighted = <T>(items: Weighted<T>[], random: DemoRandom): T => {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let cursor = random() * total

  for (const item of items) {
    cursor -= item.weight

    if (cursor <= 0) {
      return item.value
    }
  }

  return items[items.length - 1].value
}

const intBetween = (min: number, max: number, random: DemoRandom) =>
  Math.floor(random() * (max - min + 1)) + min

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const percentHash = (value: string) =>
  parseInt(createHash('sha256').update(value).digest('hex').slice(0, 8), 16) %
  100
