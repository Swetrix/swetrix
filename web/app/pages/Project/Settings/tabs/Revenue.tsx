import { ArrowUpRightIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import { useDeduplicateFetcherResponse } from '~/hooks/useDeduplicateFetcherResponse'
import { DOCS_URL } from '~/lib/constants'
import type {
  ProjectSettingsActionData,
  RevenueStatus,
} from '~/routes/projects.settings.$id'
import { Badge } from '~/ui/Badge'
import Button from '~/ui/Button'
import PaddleSVG from '~/ui/icons/Paddle'
import StripeSVG from '~/ui/icons/Stripe'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'

type RevenueProvider = 'stripe' | 'paddle'
type RevenueCurrency = 'USD' | 'EUR' | 'GBP'

interface CurrencyOption {
  code: RevenueCurrency
  symbol: string
  name: string
}

const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
]

const isRevenueCurrency = (currency?: string): currency is RevenueCurrency =>
  currency === 'USD' || currency === 'EUR' || currency === 'GBP'

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
    icon: <StripeSVG className='size-6' />,
    apiKeyPrefix: 'rk_live_',
    apiKeyCreateUrl: STRIPE_API_KEY_CREATE_URL,
    docsUrl: `${DOCS_URL}/revenue/stripe`,
  },
  paddle: {
    label: 'Paddle',
    icon: <PaddleSVG className='size-6' />,
    apiKeyPrefix: 'pdl_live_',
    docsUrl: `${DOCS_URL}/analytics-dashboard/revenue-tracking#supported-sources`,
  },
}

const REVENUE_PROVIDERS: RevenueProvider[] = ['stripe', 'paddle']

interface Props {
  projectId: string
}

const Revenue = ({ projectId }: Props) => {
  const { t } = useTranslation('common')
  const fetcher = useFetcher<ProjectSettingsActionData>()

  const [status, setStatus] = useState<RevenueStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [apiKeys, setApiKeys] = useState<Record<RevenueProvider, string>>({
    stripe: '',
    paddle: '',
  })
  const [selectedCurrency, setSelectedCurrency] =
    useState<RevenueCurrency>('USD')
  const pendingCurrency = useRef<{
    requestId: string
    previous: RevenueCurrency
    next: RevenueCurrency
  } | null>(null)
  const currencyRequestId = useRef(0)
  const shouldHandleFetcherData =
    useDeduplicateFetcherResponse<ProjectSettingsActionData>()

  const isConnecting =
    fetcher.state !== 'idle' &&
    fetcher.formData?.get('intent') === 'connect-revenue'
  const connectingProvider = fetcher.formData?.get('provider')?.toString()
  const isDisconnecting =
    fetcher.state !== 'idle' &&
    fetcher.formData?.get('intent') === 'disconnect-revenue'
  useEffect(() => {
    fetcher.submit(
      { intent: 'get-revenue-status' },
      { method: 'POST', action: `/projects/settings/${projectId}` },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return
    if (!shouldHandleFetcherData(fetcher.data)) return

    const { intent, success, error, revenueStatus } = fetcher.data

    if (intent === 'get-revenue-status') {
      setIsLoading(false)
      if (success && revenueStatus) {
        setStatus(revenueStatus)
        if (isRevenueCurrency(revenueStatus.currency)) {
          setSelectedCurrency(revenueStatus.currency)
        }
      } else if (error) {
        console.error('Failed to load revenue status:', error)
      }
    } else if (intent === 'connect-revenue') {
      if (success) {
        toast.success(t('project.settings.revenue.connected'))
        setApiKeys({ stripe: '', paddle: '' })
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
      const pending = pendingCurrency.current
      if (
        !pending ||
        fetcher.data.revenueCurrencyRequestId !== pending.requestId
      ) {
        return
      }

      if (success) {
        toast.success(t('project.settings.revenue.currencyUpdated'))
        setStatus((prev) => ({
          ...(prev || { connected: false }),
          currency: pending.next,
        }))
        pendingCurrency.current = null
      } else if (error) {
        setSelectedCurrency(pending.previous)
        pendingCurrency.current = null
        toast.error(error)
      }
    }
  }, [
    fetcher.state,
    fetcher.data,
    t,
    projectId,
    fetcher,
    shouldHandleFetcherData,
  ])

  const handleApiKeyChange = (provider: RevenueProvider, value: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: value }))
  }

  const handleConnect = (provider: RevenueProvider) => {
    const apiKey = apiKeys[provider].trim()

    if (!apiKey) {
      toast.error(t('project.settings.revenue.apiKeyRequired'))
      return
    }

    fetcher.submit(
      {
        intent: 'connect-revenue',
        provider,
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

  const handleCurrencyChange = (
    currency: RevenueCurrency,
    previousCurrency: RevenueCurrency,
  ) => {
    const requestId = String(++currencyRequestId.current)
    pendingCurrency.current = {
      requestId,
      previous: previousCurrency,
      next: currency,
    }
    fetcher.submit(
      { intent: 'update-revenue-currency', currency, requestId },
      { method: 'POST', action: `/projects/settings/${projectId}` },
    )
  }

  const isConnectingProvider = (provider: RevenueProvider) =>
    isConnecting && connectingProvider === provider

  if (isLoading) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <Loader />
      </div>
    )
  }

  const connectedProvider =
    status?.provider === 'stripe' || status?.provider === 'paddle'
      ? status.provider
      : undefined
  const isConnected = Boolean(status?.connected && connectedProvider)
  const selectedCurrencyItem =
    SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency) ||
    SUPPORTED_CURRENCIES[0]
  const currencyTitle = `${selectedCurrencyItem.code} – ${selectedCurrencyItem.name} (${selectedCurrencyItem.symbol})`

  const renderProviderSection = (provider: RevenueProvider) => {
    const config = PROVIDER_CONFIG[provider]
    const providerConnected = isConnected && connectedProvider === provider
    const providerHelpUrl = config.apiKeyCreateUrl || config.docsUrl
    const providerHelpLabel = config.apiKeyCreateUrl
      ? t('project.settings.revenue.createApiKeyLink', {
          provider: config.label,
        })
      : t('project.settings.revenue.setupGuideLink', {
          provider: config.label,
        })

    return (
      <section key={provider} className={provider === 'paddle' ? 'mt-6' : ''}>
        <Text
          as='h3'
          size='lg'
          weight='medium'
          className='mb-2 flex items-center gap-2'
        >
          {config.icon}
          {config.label}
          <Badge
            colour={providerConnected ? 'green' : 'slate'}
            size='sm'
            label={
              providerConnected
                ? t('common.connected')
                : t('common.notConnected')
            }
          />
        </Text>

        <Input
          name={`${provider}ApiKey`}
          type='password'
          autoComplete='off'
          label={t('project.settings.revenue.providerApiKey', {
            provider: config.label,
          })}
          hint={
            <>
              {t(`project.settings.revenue.apiKeyHints.${provider}`)}{' '}
              {providerHelpUrl ? (
                <a
                  href={providerHelpUrl}
                  target='_blank'
                  rel='noreferrer noopener'
                  className='inline-flex items-center font-medium underline decoration-dashed hover:decoration-solid'
                >
                  {providerHelpLabel}
                  <ArrowUpRightIcon className='ml-0.5 h-3 w-3' />
                </a>
              ) : null}
            </>
          }
          value={apiKeys[provider]}
          className='lg:w-1/2'
          placeholder={
            providerConnected
              ? t('project.settings.revenue.storedKeyPlaceholder')
              : `${config.apiKeyPrefix}********************`
          }
          onChange={(e) => handleApiKeyChange(provider, e.target.value)}
          disabled={isConnecting || isDisconnecting}
        />

        {providerConnected && status?.lastSyncAt ? (
          <Text as='p' size='sm' colour='secondary' className='mt-2'>
            {t('project.settings.revenue.lastSync', {
              date: new Date(status.lastSyncAt).toLocaleString(),
            })}
          </Text>
        ) : null}

        <div className='mt-4 flex flex-wrap gap-2'>
          <Button
            type='button'
            className='max-w-max'
            onClick={() => handleConnect(provider)}
            loading={isConnectingProvider(provider)}
            disabled={
              (isConnecting && !isConnectingProvider(provider)) ||
              isDisconnecting
            }
          >
            {providerConnected
              ? t('project.settings.revenue.updateKey')
              : t('common.connect')}
          </Button>
          {providerConnected ? (
            <Button
              variant='danger-outline'
              type='button'
              className='max-w-max'
              onClick={handleDisconnect}
              loading={isDisconnecting}
              disabled={isConnecting}
            >
              {t('common.disconnect')}
            </Button>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <div>
      {REVENUE_PROVIDERS.map(renderProviderSection)}

      <Text
        as='h3'
        size='lg'
        weight='medium'
        colour='primary'
        className='mt-6 mb-2'
      >
        {t('project.settings.revenue.settingsTitle')}
      </Text>

      <div className='flex flex-col gap-4'>
        <Select<CurrencyOption>
          label={t('project.settings.revenue.currency')}
          hint={t('project.settings.revenue.currencyDescription')}
          className='lg:w-1/2'
          title={currencyTitle}
          items={SUPPORTED_CURRENCIES}
          keyExtractor={(item) => item.code}
          labelExtractor={(item) =>
            `${item.code} – ${item.name} (${item.symbol})`
          }
          selectedItem={selectedCurrencyItem}
          onSelect={(item) => {
            if (item.code === selectedCurrency) return

            const previousCurrency = selectedCurrency
            setSelectedCurrency(item.code)
            handleCurrencyChange(item.code, previousCurrency)
          }}
        />
      </div>

      <a
        href={`${DOCS_URL}/revenue`}
        target='_blank'
        rel='noreferrer noopener'
        className='mt-6 inline-flex items-center text-sm font-medium underline decoration-dashed hover:decoration-solid'
      >
        <ArrowSquareOutIcon className='mr-1.5 h-4 w-4' />
        {t('project.settings.revenue.learnMore')}
      </a>
    </div>
  )
}

export default Revenue
