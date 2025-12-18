import { ArrowUpRightIcon, CheckCircle2Icon, LinkIcon } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { connectRevenue, disconnectRevenue, getRevenueStatus, updateRevenueCurrency } from '~/api'
import type { RevenueProvider } from '~/api'
import { DOCS_URL } from '~/lib/constants'
import Button from '~/ui/Button'
import Loader from '~/ui/Loader'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'

interface RevenueStatus {
  connected: boolean
  provider?: string
  currency?: string
  lastSyncAt?: string
}

const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
]

const STRIPE_REQUIRED_PERMISSIONS = [
  'rak_charge_read',
  'rak_subscription_read',
  'rak_customer_read',
  'rak_payment_intent_read',
  'rak_checkout_session_read',
  'rak_invoice_read',
  'rak_webhook_write',
  'rak_product_read',
]

const STRIPE_API_KEY_CREATE_URL = `https://dashboard.stripe.com/apikeys/create?name=Swetrix&permissions%5B%5D=${STRIPE_REQUIRED_PERMISSIONS.join('&permissions%5B%5D=')}`

interface ProviderConfig {
  label: string
  icon: React.ReactNode
  apiKeyPrefix: string
  apiKeyCreateUrl?: string
}

const PROVIDER_CONFIG: Record<RevenueProvider, ProviderConfig> = {
  stripe: {
    label: 'Stripe',
    icon: (
      <div className='flex h-5 w-5 items-center justify-center rounded bg-[#635BFF] text-xs font-bold text-white'>
        S
      </div>
    ),
    apiKeyPrefix: 'rk_live_',
    apiKeyCreateUrl: STRIPE_API_KEY_CREATE_URL,
  },
  paddle: {
    label: 'Paddle',
    icon: (
      <div className='flex h-5 w-5 items-center justify-center rounded bg-[#FFCE00] text-xs font-bold text-[#0E1B2B]'>
        P
      </div>
    ),
    apiKeyPrefix: 'pdl_live_',
  },
}

const REVENUE_PROVIDERS: RevenueProvider[] = ['stripe', 'paddle']

interface ProviderItem {
  id: RevenueProvider
  label: string
  icon: React.ReactNode
}

const PROVIDER_ITEMS: ProviderItem[] = REVENUE_PROVIDERS.map((p) => ({
  id: p,
  label: PROVIDER_CONFIG[p].label,
  icon: PROVIDER_CONFIG[p].icon,
}))

interface Props {
  projectId: string
}

const Revenue = ({ projectId }: Props) => {
  const { t } = useTranslation('common')

  const [status, setStatus] = useState<RevenueStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<RevenueProvider>('stripe')
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isSavingCurrency, setIsSavingCurrency] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const result = await getRevenueStatus(projectId)
      setStatus(result)
      if (result.provider === 'stripe' || result.provider === 'paddle') {
        setSelectedProvider(result.provider)
      }
      if (result.currency === 'USD' || result.currency === 'EUR' || result.currency === 'GBP') {
        setSelectedCurrency(result.currency)
      }
    } catch (error) {
      console.error('Failed to load revenue status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast.error(t('project.settings.revenue.apiKeyRequired'))
      return
    }

    setIsConnecting(true)
    try {
      await connectRevenue(projectId, selectedProvider, apiKey, selectedCurrency)
      toast.success(t('project.settings.revenue.connected'))
      setApiKey('')
      await loadStatus()
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : t('apiNotifications.somethingWentWrong'))
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      await disconnectRevenue(projectId)
      toast.success(t('project.settings.revenue.disconnected'))
      setStatus({ connected: false })
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : t('apiNotifications.somethingWentWrong'))
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleCurrencyChange = async () => {
    if (!status?.connected) return

    setIsSavingCurrency(true)
    try {
      await updateRevenueCurrency(projectId, selectedCurrency)
      toast.success(t('project.settings.revenue.currencyUpdated'))
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : t('apiNotifications.somethingWentWrong'))
    } finally {
      setIsSavingCurrency(false)
    }
  }

  if (isLoading) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <Loader />
      </div>
    )
  }

  const providerConfig = PROVIDER_CONFIG[selectedProvider]
  const isConnected = Boolean(status?.connected)
  const isSelectedProviderConnected = isConnected && status?.provider === selectedProvider
  const apiKeyCreateUrl = providerConfig.apiKeyCreateUrl
  const apiKeyPlaceholder = `${providerConfig.apiKeyPrefix}********************`

  const selectedProviderItem = PROVIDER_ITEMS.find((p) => p.id === selectedProvider)

  return (
    <div>
      <Text as='h3' size='lg' weight='bold' colour='primary'>
        {t('project.settings.revenue.title', { defaultValue: 'Revenue tracking' })}
      </Text>
      <Text as='p' size='sm' colour='muted' className='mt-1'>
        {t('project.settings.revenue.description', {
          defaultValue: 'Connect your payment provider to track revenue alongside your analytics.',
        })}
      </Text>

      <div className='mt-6 space-y-3'>
        {/* Step 1: Pick provider */}
        <div className='rounded-md border border-gray-200 p-3 dark:border-gray-800'>
          <div className='flex items-start'>
            <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'>
              1
            </div>
            <div className='ml-3 flex-1'>
              <Text as='div' size='sm' weight='medium' colour='primary'>
                {t('project.settings.revenue.pickProvider', { defaultValue: 'Pick your payment provider' })}
              </Text>
              <div className='mt-2'>
                <Select
                  className='max-w-xs'
                  title={providerConfig.label}
                  items={PROVIDER_ITEMS}
                  labelExtractor={(item) => (
                    <div className='flex items-center gap-2'>
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  )}
                  keyExtractor={(item) => item.id}
                  iconExtractor={(item) => item.icon}
                  selectedItem={selectedProviderItem}
                  onSelect={(item: ProviderItem) => {
                    setSelectedProvider(item.id)
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Connect */}
        <div className='rounded-md border border-gray-200 p-3 dark:border-gray-800'>
          <div className='flex items-start'>
            <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'>
              2
            </div>
            <div className='ml-3 flex-1'>
              <Text as='div' size='sm' weight='medium' colour='primary'>
                {t('project.settings.revenue.connectProvider', {
                  defaultValue: `Connect ${providerConfig.label}`,
                  provider: providerConfig.label,
                })}
              </Text>
              <Text as='p' size='sm' colour='muted' className='mt-0.5'>
                {t('project.settings.revenue.createApiKey', { defaultValue: 'Create a' })}{' '}
                {apiKeyCreateUrl ? (
                  <a
                    href={apiKeyCreateUrl}
                    target='_blank'
                    rel='noreferrer noopener'
                    className='inline-flex items-center text-indigo-600 underline decoration-dashed hover:decoration-solid dark:text-indigo-400'
                  >
                    {t('project.settings.revenue.restrictedApiKey', { defaultValue: 'restricted API key' })}
                    <ArrowUpRightIcon className='ml-0.5 h-3 w-3' />
                  </a>
                ) : (
                  <span className='font-medium'>
                    {t('project.settings.revenue.restrictedApiKey', { defaultValue: 'restricted API key' })}
                  </span>
                )}{' '}
                {t('project.settings.revenue.pasteBelow', {
                  defaultValue: '(do not change any permissions) and paste it below.',
                })}
              </Text>

              {isConnected && !isSelectedProviderConnected && status?.provider ? (
                <Text as='p' size='sm' colour='warning' className='mt-2'>
                  {t('project.settings.revenue.replaceWarning', {
                    defaultValue: `This project is connected to ${PROVIDER_CONFIG[status.provider as RevenueProvider]?.label || status.provider}. Connecting ${providerConfig.label} will replace the existing connection.`,
                  })}
                </Text>
              ) : null}

              <div className='mt-3'>
                <input
                  type='text'
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={apiKeyPlaceholder}
                  className='block w-full max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-50 dark:placeholder:text-gray-500'
                  disabled={isConnecting}
                />
              </div>

              {!isSelectedProviderConnected ? (
                <Button className='mt-3' onClick={handleConnect} loading={isConnecting} primary regular>
                  {t('common.connect')}
                </Button>
              ) : (
                <div className='mt-3 flex flex-wrap items-center gap-3'>
                  <div className='flex items-center gap-1.5'>
                    <CheckCircle2Icon className='h-4 w-4 text-green-600 dark:text-green-400' />
                    <Text as='span' size='sm' colour='success' weight='medium'>
                      {t('common.connected')}
                      {status?.lastSyncAt ? ` · ${new Date(status.lastSyncAt).toLocaleString()}` : ''}
                    </Text>
                  </div>
                  <Button onClick={handleDisconnect} loading={isDisconnecting} semiDanger semiSmall>
                    {t('common.disconnect')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Link with traffic */}
        <div className='rounded-md border border-gray-200 p-3 dark:border-gray-800'>
          <div className='flex items-start'>
            <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'>
              3
            </div>
            <div className='ml-3 flex-1'>
              <Text as='div' size='sm' weight='medium' colour='primary'>
                {t('project.settings.revenue.linkWithTraffic', { defaultValue: 'Link with traffic' })}
              </Text>
              <Text as='p' size='sm' colour='muted' className='mt-0.5'>
                {t('project.settings.revenue.linkDescription', {
                  defaultValue: 'Make revenue-driven decisions by linking your revenue data with your traffic data.',
                })}{' '}
                <a
                  href={DOCS_URL}
                  target='_blank'
                  rel='noreferrer noopener'
                  className='inline-flex items-center text-indigo-600 underline decoration-dashed hover:decoration-solid dark:text-indigo-400'
                >
                  {t('project.settings.revenue.getStarted', { defaultValue: 'Get started here' })}
                  <LinkIcon className='ml-0.5 h-3 w-3' />
                </a>{' '}
                <span className='text-gray-400 dark:text-gray-500'>
                  {t('project.settings.revenue.timeEstimate', { defaultValue: '(takes ~2 minutes)' })}
                </span>
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Currency settings */}
      <div className='mt-6'>
        <Text as='h4' size='sm' weight='medium' colour='primary'>
          {t('project.settings.revenue.currency', { defaultValue: 'Currency' })}
        </Text>
        <Text as='p' size='sm' colour='muted' className='mt-0.5'>
          {t('project.settings.revenue.currencyDescription', {
            defaultValue: 'Used for all revenue reporting and payment conversion.',
          })}
        </Text>
        <div className='mt-2 flex flex-wrap items-center gap-3'>
          <Select
            className='max-w-xs'
            title={`${selectedCurrency} – ${SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency)?.name} (${SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency)?.symbol})`}
            items={SUPPORTED_CURRENCIES}
            keyExtractor={(item) => item.code}
            labelExtractor={(item) => `${item.code} – ${item.name} (${item.symbol})`}
            onSelect={(item: { code: string; name: string; symbol: string }) =>
              setSelectedCurrency(item.code as 'USD' | 'EUR' | 'GBP')
            }
          />
          <Button onClick={handleCurrencyChange} loading={isSavingCurrency} primary regular disabled={!isConnected}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Revenue
