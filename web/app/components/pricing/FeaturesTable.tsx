import { CheckIcon, MinusIcon } from '@heroicons/react/24/solid'
import cx from 'clsx'
import React from 'react'
import { useTranslation } from 'react-i18next'

type FeatureValue = boolean | string

interface Feature {
  name: string
  standard: FeatureValue
  enterprise: FeatureValue
}

interface FeatureCategory {
  category: string
  features: Feature[]
}

const FEATURE_DATA: FeatureCategory[] = [
  {
    category: 'pricing.features.analytics',
    features: [
      { name: 'pricing.features.trafficAnalytics', standard: true, enterprise: true },
      { name: 'pricing.features.customEvents', standard: true, enterprise: true },
      { name: 'pricing.features.performanceMonitoring', standard: true, enterprise: true },
      { name: 'pricing.features.errorTracking', standard: true, enterprise: true },
      { name: 'pricing.features.funnels', standard: true, enterprise: true },
      { name: 'pricing.features.sessionAnalysis', standard: true, enterprise: true },
      { name: 'pricing.features.userFlow', standard: true, enterprise: true },
      { name: 'pricing.features.annotations', standard: true, enterprise: true },
      { name: 'pricing.features.customAlerts', standard: true, enterprise: true },
      { name: 'pricing.features.emailReports', standard: true, enterprise: true },
    ],
  },
  {
    category: 'pricing.features.dataManagement',
    features: [
      {
        name: 'pricing.features.dataRetention',
        standard: 'pricing.features.unlimited',
        enterprise: 'pricing.features.unlimited',
      },
      { name: 'pricing.features.dataExport', standard: true, enterprise: true },
      { name: 'pricing.features.dataOwnership', standard: true, enterprise: true },
      { name: 'pricing.features.gdprCompliant', standard: true, enterprise: true },
    ],
  },
  {
    category: 'pricing.features.collaboration',
    features: [
      {
        name: 'pricing.features.teamMembers',
        standard: 'pricing.features.unlimited',
        enterprise: 'pricing.features.unlimited',
      },
      { name: 'pricing.features.projectSharing', standard: true, enterprise: true },
      { name: 'pricing.features.publicDashboards', standard: true, enterprise: true },
      { name: 'pricing.features.organisations', standard: true, enterprise: true },
    ],
  },
  {
    category: 'pricing.features.apiAccess',
    features: [
      { name: 'pricing.features.statisticsApi', standard: true, enterprise: true },
      { name: 'pricing.features.eventsApi', standard: true, enterprise: true },
      { name: 'pricing.features.adminApi', standard: true, enterprise: true },
    ],
  },
  {
    category: 'pricing.features.security',
    features: [
      { name: 'pricing.features.twoFactorAuth', standard: true, enterprise: true },
      { name: 'pricing.features.ssoSaml', standard: false, enterprise: true },
      { name: 'pricing.features.auditLogs', standard: false, enterprise: true },
      { name: 'pricing.features.roleBasedAccess', standard: true, enterprise: true },
    ],
  },
  {
    category: 'pricing.features.supportCategory',
    features: [
      { name: 'pricing.features.communitySupport', standard: true, enterprise: true },
      { name: 'pricing.features.emailSupport', standard: true, enterprise: true },
      { name: 'pricing.features.prioritySupport', standard: false, enterprise: true },
      { name: 'pricing.features.slackSupport', standard: false, enterprise: true },
      { name: 'pricing.features.dedicatedManager', standard: false, enterprise: true },
      { name: 'pricing.features.manualInvoicing', standard: false, enterprise: true },
      { name: 'pricing.features.uptimeSla', standard: false, enterprise: 'pricing.features.slaValue' },
      { name: 'pricing.features.customContracts', standard: false, enterprise: true },
    ],
  },
  {
    category: 'pricing.features.deployment',
    features: [
      { name: 'pricing.features.cloudHosted', standard: true, enterprise: true },
      { name: 'pricing.features.selfHosted', standard: true, enterprise: true },
      { name: 'pricing.features.onPremise', standard: false, enterprise: true },
      { name: 'pricing.features.customIntegrations', standard: false, enterprise: true },
    ],
  },
]

const FeatureValueCell = ({ value }: { value: FeatureValue }) => {
  const { t } = useTranslation('common')

  if (typeof value === 'boolean') {
    return value ? (
      <CheckIcon className='mx-auto size-5 text-emerald-500' aria-label={t('common.yes')} />
    ) : (
      <MinusIcon className='mx-auto size-5 text-gray-400 dark:text-gray-500' aria-label={t('common.no')} />
    )
  }

  return <span className='text-sm font-medium text-slate-700 dark:text-gray-200'>{t(value)}</span>
}

interface FeaturesTableProps {
  className?: string
}

const FeaturesTable = ({ className }: FeaturesTableProps) => {
  const { t } = useTranslation('common')

  return (
    <section className={cx('py-16 sm:py-20', className)}>
      <div className='mx-auto max-w-5xl px-4 sm:px-6 lg:px-8'>
        <div className='text-center'>
          <h2 className='text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white'>
            {t('pricing.features.title')}
          </h2>
          <p className='mx-auto mt-4 max-w-2xl text-base text-slate-600 dark:text-gray-300'>
            {t('pricing.features.subtitle')}
          </p>
        </div>

        <div className='mt-12 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800/50'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800'>
                <th className='px-4 py-4 text-left text-sm font-semibold text-slate-900 sm:px-6 dark:text-white'>
                  {t('pricing.features.feature')}
                </th>
                <th className='w-32 px-4 py-4 text-center text-sm font-semibold text-slate-900 sm:w-40 sm:px-6 dark:text-white'>
                  {t('pricing.features.standard')}
                </th>
                <th className='w-32 px-4 py-4 text-center text-sm font-semibold text-slate-900 sm:w-40 sm:px-6 dark:text-white'>
                  {t('pricing.features.enterprise')}
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_DATA.map((category) => (
                <React.Fragment key={category.category}>
                  <tr className='border-t border-gray-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/80'>
                    <td
                      colSpan={3}
                      className='px-4 py-3 text-sm font-semibold tracking-wide text-indigo-600 uppercase sm:px-6 dark:text-indigo-400'
                    >
                      {t(category.category)}
                    </td>
                  </tr>
                  {category.features.map((feature, featureIndex) => (
                    <tr
                      key={feature.name}
                      className={cx(
                        'border-t border-gray-100 dark:border-slate-700/50',
                        featureIndex % 2 === 0 ? 'bg-white dark:bg-slate-800/30' : 'bg-gray-50/50 dark:bg-slate-800/50',
                      )}
                    >
                      <td className='px-4 py-3 text-sm text-slate-700 sm:px-6 dark:text-gray-300'>{t(feature.name)}</td>
                      <td className='px-4 py-3 text-center sm:px-6'>
                        <FeatureValueCell value={feature.standard} />
                      </td>
                      <td className='px-4 py-3 text-center sm:px-6'>
                        <FeatureValueCell value={feature.enterprise} />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className='mt-8 text-center'>
          <p className='text-sm text-slate-500 dark:text-gray-400'>
            {t('pricing.features.needMore')}{' '}
            <a
              href='/contact'
              className='font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300'
            >
              {t('pricing.features.contactUs')}
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

export default FeaturesTable
