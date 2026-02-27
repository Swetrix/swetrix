import {
  ArrowUpRightIcon,
  ArrowSquareOutIcon,
  CheckCircleIcon,
} from '@phosphor-icons/react'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import { DOCS_URL } from '~/lib/constants'
import type {
  ProjectSettingsActionData,
  RevenueStatus,
} from '~/routes/projects.settings.$id'
import Button from '~/ui/Button'
import PaddleSVG from '~/ui/icons/Paddle'
import StripeSVG from '~/ui/icons/Stripe'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'

type RevenueProvider = 'stripe' | 'paddle'

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
  docsUrl?: string
}

const PROVIDER_CONFIG: Record<RevenueProvider, ProviderConfig> = {
  stripe: {
    label: 'Stripe',
    icon: <StripeSVG className='h-5 w-5' />,
    apiKeyPrefix: 'rk_live_',
    apiKeyCreateUrl: STRIPE_API_KEY_CREATE_URL,
    docsUrl: `${DOCS_URL}/revenue/stripe`,
  },
  paddle: {
    label: 'Paddle',
    icon: <PaddleSVG className='h-5 w-5' />,
    apiKeyPrefix: 'pdl_live_',
    docsUrl: `${DOCS_URL}/revenue/paddle`,
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
  const fetcher = useFetcher<ProjectSettingsActionData>()

  const [status, setStatus] = useState<RevenueStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [selectedProvider, setSelectedProvider] =
    useState<RevenueProvider>('stripe')
  const [selectedCurrency, setSelectedCurrency] = useState<
    'USD' | 'EUR' | 'GBP'
  >('USD')

  const isConnecting =
    fetcher.state !== 'idle' &&
    fetcher.formData?.get('intent') === 'connect-revenue'
  const isDisconnecting =
    fetcher.state !== 'idle' &&
    fetcher.formData?.get('intent') === 'disconnect-revenue'
  const isSavingCurrency =
    fetcher.state !== 'idle' &&
    fetcher.formData?.get('intent') === 'update-revenue-currency'

  useEffect(() => {
    fetcher.submit(
      { intent: 'get-revenue-status' },
      { method: 'POST', action: `/projects/settings/${projectId}` },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const { intent, success, error, revenueStatus } = fetcher.data

      if (intent === 'get-revenue-status') {
        setIsLoading(false)
        if (success && revenueStatus) {
          setStatus(revenueStatus)
          if (
            revenueStatus.provider === 'stripe' ||
            revenueStatus.provider === 'paddle'
          ) {
            setSelectedProvider(revenueStatus.provider)
          }
          if (
            revenueStatus.currency === 'USD' ||
            revenueStatus.currency === 'EUR' ||
            revenueStatus.currency === 'GBP'
          ) {
            setSelectedCurrency(revenueStatus.currency)
          }
        } else if (error) {
          console.error('Failed to load revenue status:', error)
        }
      } else if (intent === 'connect-revenue') {
        if (success) {
          toast.success(t('project.settings.revenue.connected'))
          setApiKey('')
          fetcher.submit(
            { intent: 'get-revenue-status' },
            { method: 'POST', action: `/projects/settings/${projectId}` },
          )
        } else if (error) {
          toast.error(error)
        }
      } else if (intent === 'disconnect-revenue') {
        if (success) {
          toast.success(t('project.settings.revenue.disconnected'))
          setStatus({ connected: false })
        } else if (error) {
          toast.error(error)
        }
      } else if (intent === 'update-revenue-currency') {
        if (success) {
          toast.success(t('project.settings.revenue.currencyUpdated'))
          setStatus((prev) =>
            prev ? { ...prev, currency: selectedCurrency } : prev,
          )
        } else if (error) {
          toast.error(error)
        }
      }
    }
  }, [fetcher.state, fetcher.data, t, projectId, selectedCurrency, fetcher])

  const handleConnect = () => {
    if (!apiKey.trim()) {
      toast.error(t('project.settings.revenue.apiKeyRequired'))
      return
    }

    fetcher.submit(
      {
        intent: 'connect-revenue',
        provider: selectedProvider,
        apiKey,
        currency: selectedCurrency,
      },
      { method: 'POST', action: `/projects/settings/${projectId}` },
    )
  }

  const handleDisconnect = () => {
    fetcher.submit(
      { intent: 'disconnect-revenue' },
      { method: 'POST', action: `/projects/settings/${projectId}` },
    )
  }

  const handleCurrencyChange = () => {
    if (!status?.connected) return

    fetcher.submit(
      { intent: 'update-revenue-currency', currency: selectedCurrency },
      { method: 'POST', action: `/projects/settings/${projectId}` },
    )
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
  const connectedProvider = status?.provider as RevenueProvider | undefined
  const connectedProviderConfig = connectedProvider
    ? PROVIDER_CONFIG[connectedProvider]
    : null
  const selectedProviderItem = PROVIDER_ITEMS.find(
    (p) => p.id === selectedProvider,
  )

  return (
    <div>
      <Text as='h3' size='lg' weight='bold' colour='primary'>
        {t('project.settings.revenue.title')}
      </Text>
      <Text as='p' size='sm' colour='secondary' className='mt-1'>
        {t('project.settings.revenue.description')}
      </Text>

      {/* Provider Connection Card */}
      <div className='mt-4 rounded-lg border border-gray-200 p-4 dark:border-slate-800'>
        <div className='flex items-center gap-2'>
          <div>{connectedProviderConfig?.icon || providerConfig.icon}</div>
          <Text as='h4' size='base' weight='medium' colour='primary'>
            {t('project.settings.revenue.paymentProvider')}
          </Text>
          {isConnected ? (
            <Text
              size='sm'
              colour='success'
              className='ml-auto flex items-center gap-1'
            >
              <CheckCircleIcon className='h-4 w-4' />
              {t('common.connected')}
            </Text>
          ) : null}
        </div>

        {isConnected && connectedProviderConfig ? (
          <div className='mt-4 flex flex-col gap-4'>
            <Input
              label={t('project.settings.revenue.connectedTo')}
              value={connectedProviderConfig.label}
              className='lg:w-1/2'
              disabled
            />

            {status?.lastSyncAt ? (
              <Text as='p' size='sm' colour='muted'>
                {t('project.settings.revenue.lastSync', {
                  date: new Date(status.lastSyncAt).toLocaleString(),
                })}{' '}
              </Text>
            ) : null}

            <Button
              type='button'
              className='max-w-max'
              onClick={handleDisconnect}
              loading={isDisconnecting}
              semiDanger
              regular
            >
              {t('common.disconnect')}
            </Button>
          </div>
        ) : (
          <div className='mt-4 flex flex-col gap-4'>
            <Select
              label={t('project.settings.revenue.provider')}
              className='lg:w-1/2'
              title={providerConfig.label}
              items={PROVIDER_ITEMS}
              labelExtractor={(item) => (
                <div className='flex items-center gap-2'>
                  {item.icon}
                  <Text>{item.label}</Text>
                </div>
              )}
              keyExtractor={(item) => item.id}
              selectedItem={selectedProviderItem}
              onSelect={(item: ProviderItem) => {
                setSelectedProvider(item.id)
              }}
            />

            <div>
              <Input
                name='apiKey'
                type='password'
                label={t('project.settings.revenue.apiKey')}
                hint={
                  providerConfig.apiKeyCreateUrl ? (
                    <Text as='span' size='sm' colour='muted'>
                      {t('project.settings.revenue.createApiKeyHint')}{' '}
                      <a
                        href={providerConfig.apiKeyCreateUrl}
                        target='_blank'
                        rel='noreferrer noopener'
                        className='inline-flex items-center font-medium underline decoration-dashed hover:decoration-solid'
                      >
                        {providerConfig.label}{' '}
                        {t('project.settings.revenue.dashboard')}
                        <ArrowUpRightIcon className='ml-0.5 h-3 w-3' />
                      </a>
                    </Text>
                  ) : undefined
                }
                value={apiKey}
                className='lg:w-1/2'
                placeholder={`${providerConfig.apiKeyPrefix}********************`}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isConnecting}
              />
            </div>

            <Button
              type='button'
              className='max-w-max'
              onClick={handleConnect}
              loading={isConnecting}
              primary
              regular
            >
              {t('common.connect')}
            </Button>
          </div>
        )}
      </div>

      {/* Currency Settings */}
      <div className='mt-6 rounded-lg border border-gray-200 p-4 dark:border-slate-800'>
        <Text as='h4' size='base' weight='medium' colour='primary'>
          {t('project.settings.revenue.currency')}
        </Text>
        <Text as='p' size='sm' colour='secondary' className='mt-1'>
          {t('project.settings.revenue.currencyDescription')}
        </Text>

        <div className='mt-4 flex flex-col gap-4'>
          <Select
            className='lg:w-1/2'
            title={`${selectedCurrency} – ${SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency)?.name} (${SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency)?.symbol})`}
            items={SUPPORTED_CURRENCIES}
            keyExtractor={(item) => item.code}
            labelExtractor={(item) =>
              `${item.code} – ${item.name} (${item.symbol})`
            }
            selectedItem={SUPPORTED_CURRENCIES.find(
              (c) => c.code === selectedCurrency,
            )}
            onSelect={(item: { code: string; name: string; symbol: string }) =>
              setSelectedCurrency(item.code as 'USD' | 'EUR' | 'GBP')
            }
          />
          <Button
            type='button'
            className='max-w-max'
            onClick={handleCurrencyChange}
            loading={isSavingCurrency}
            primary
            regular
            disabled={!isConnected}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>

      {/* Documentation Link */}
      <div className='mt-6'>
        <a
          href={DOCS_URL}
          target='_blank'
          rel='noreferrer noopener'
          className='inline-flex items-center text-sm font-medium underline decoration-dashed hover:decoration-solid'
        >
          <ArrowSquareOutIcon className='mr-1.5 h-4 w-4' />
          {t('project.settings.revenue.learnMore')}
        </a>
      </div>
    </div>
  )
}

export default Revenue
