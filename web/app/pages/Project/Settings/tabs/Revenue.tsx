import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  connectPaddleRevenue,
  disconnectPaddleRevenue,
  getRevenueStatus,
  syncRevenue,
  updateRevenueCurrency,
} from '~/api'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Loader from '~/ui/Loader'
import Select from '~/ui/Select'

interface RevenueStatus {
  connected: boolean
  provider?: string
  currency?: string
  lastSyncAt?: string
}

const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
]

const PADDLE_DOCS_URL = 'https://developer.paddle.com/api-reference/about/authentication'

interface Props {
  projectId: string
}

const Revenue = ({ projectId }: Props) => {
  const { t } = useTranslation('common')

  const [status, setStatus] = useState<RevenueStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const result = await getRevenueStatus(projectId)
      setStatus(result)
      if (result.currency) {
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
      await connectPaddleRevenue(projectId, apiKey, selectedCurrency)
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
    try {
      await disconnectPaddleRevenue(projectId)
      toast.success(t('project.settings.revenue.disconnected'))
      setStatus({ connected: false })
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : t('apiNotifications.somethingWentWrong'))
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await syncRevenue(projectId)
      toast.success(t('project.settings.revenue.synced', { count: result.transactionsSynced }))
      await loadStatus()
    } catch (error: any) {
      toast.error(typeof error === 'string' ? error : t('apiNotifications.somethingWentWrong'))
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCurrencyChange = async (currency: string) => {
    setSelectedCurrency(currency)
    if (status?.connected) {
      try {
        await updateRevenueCurrency(projectId, currency)
        toast.success(t('project.settings.revenue.currencyUpdated'))
      } catch (error: any) {
        toast.error(typeof error === 'string' ? error : t('apiNotifications.somethingWentWrong'))
      }
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <Loader />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-lg border border-gray-200 p-4 dark:border-slate-800'>
        <h3 className='mb-2 text-lg font-medium text-gray-900 dark:text-gray-50'>
          {t('project.settings.revenue.title')}
        </h3>
        <p className='mb-4 text-sm text-gray-600 dark:text-gray-300'>{t('project.settings.revenue.description')}</p>

        {status?.connected ? (
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <div className='h-2.5 w-2.5 rounded-full bg-green-500' />
              <span className='text-sm font-medium text-gray-900 dark:text-gray-50'>
                {t('project.settings.revenue.connectedTo', { provider: 'Paddle' })}
              </span>
            </div>

            {status.lastSyncAt && (
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                {t('project.settings.revenue.lastSync', {
                  date: new Date(status.lastSyncAt).toLocaleString(),
                })}
              </p>
            )}

            <div className='flex flex-wrap gap-2'>
              <Button type='button' onClick={handleSync} loading={isSyncing} primary regular>
                {t('project.settings.revenue.syncNow')}
              </Button>
              <Button type='button' onClick={handleDisconnect} semiDanger regular>
                {t('common.disconnect')}
              </Button>
            </div>

            <hr className='border-gray-200 dark:border-slate-700' />

            <div>
              <Select
                label={t('project.settings.revenue.currency')}
                hint={t('project.settings.revenue.currencyHint')}
                className='max-w-xs'
                items={SUPPORTED_CURRENCIES}
                keyExtractor={(item) => item.code}
                labelExtractor={(item) => `${item.code} - ${item.name}`}
                selectedItem={SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency)}
                onSelect={(item: { code: string; name: string }) => handleCurrencyChange(item.code)}
                title={selectedCurrency}
              />
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            <div>
              <h4 className='mb-2 text-base font-medium text-gray-900 dark:text-gray-50'>
                {t('project.settings.revenue.connectPaddle')}
              </h4>
              <p className='mb-3 text-sm text-gray-600 dark:text-gray-300'>
                {t('project.settings.revenue.connectPaddleDesc')}
              </p>
              <a
                href={PADDLE_DOCS_URL}
                target='_blank'
                rel='noopener noreferrer'
                className='text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400'
              >
                {t('project.settings.revenue.paddleDocsLink')}
              </a>
            </div>

            <Input
              type='password'
              label={t('project.settings.revenue.apiKey')}
              hint={t('project.settings.revenue.apiKeyHint')}
              placeholder='pdl_live_...'
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className='max-w-md'
            />

            <Select
              label={t('project.settings.revenue.currency')}
              hint={t('project.settings.revenue.currencyHint')}
              className='max-w-xs'
              items={SUPPORTED_CURRENCIES}
              keyExtractor={(item) => item.code}
              labelExtractor={(item) => `${item.code} - ${item.name}`}
              selectedItem={SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency)}
              onSelect={(item: { code: string; name: string }) => setSelectedCurrency(item.code)}
              title={selectedCurrency}
            />

            <Button type='button' onClick={handleConnect} loading={isConnecting} primary regular>
              {t('common.connect')}
            </Button>
          </div>
        )}
      </div>

      <div className='rounded-lg border border-gray-200 p-4 dark:border-slate-800'>
        <h3 className='mb-2 text-lg font-medium text-gray-900 dark:text-gray-50'>
          {t('project.settings.revenue.attribution.title')}
        </h3>
        <p className='mb-4 text-sm text-gray-600 dark:text-gray-300'>
          {t('project.settings.revenue.attribution.description')}
        </p>

        <div className='rounded-md bg-gray-100 p-4 dark:bg-slate-800'>
          <p className='mb-2 text-sm font-medium text-gray-900 dark:text-gray-50'>
            {t('project.settings.revenue.attribution.paddleExample')}
          </p>
          <pre className='overflow-x-auto text-xs text-gray-700 dark:text-gray-300'>
            {`Paddle.Checkout.open({
  items: [{ priceId: 'pri_...', quantity: 1 }],
  customData: {
    swetrix_profile_id: await swetrix.getProfileId(),
    swetrix_session_id: await swetrix.getSessionId()
  }
})`}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default Revenue
