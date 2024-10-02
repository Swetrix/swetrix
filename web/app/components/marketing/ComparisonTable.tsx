import _map from 'lodash/map'
import { useTranslation } from 'react-i18next'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'
import cx from 'clsx'

const COMPETITORS_LIST = ['Google Analytics', 'Fathom', 'Plausible', 'Simple Analytics']
const SWETRIX_AND_COMPETITORS_LIST = ['Swetrix', ...COMPETITORS_LIST]

// The order in the table is defined by the Swetrix object
const COMPETITOR_FEATURE_TABLE: {
  [key: string]: {
    [key: string]: boolean
  }
} = {
  Swetrix: {
    'main.competitiveFeatures.gdpr': true, // GDPR-compatible
    'main.competitiveFeatures.open': true, // Open-source
    'main.competitiveFeatures.perf': true, // Performance
    'main.competitiveFeatures.usfl': true, // User Flow
    'main.competitiveFeatures.funnels': true, // Funnels
    'main.competitiveFeatures.sessionAnalysis': true, // Session analysis
    'main.competitiveFeatures.ext': true, // Custom extensions
    'main.competitiveFeatures.alrt': true, // Custom alerts
    'main.competitiveFeatures.pbld': true, // Public dashboards
    'main.competitiveFeatures.shad': true, // Dashboard sharing
    'main.competitiveFeatures.ckfree': true, // Has a free plan
    'main.competitiveFeatures.api': true, // Has a free plan
    'main.competitiveFeatures.2fa': true, // 2FA
  },
  'Google Analytics': {
    'main.competitiveFeatures.gdpr': false,
    'main.competitiveFeatures.open': false,
    'main.competitiveFeatures.perf': false,
    'main.competitiveFeatures.usfl': true,
    'main.competitiveFeatures.funnels': true,
    'main.competitiveFeatures.sessionAnalysis': false,
    'main.competitiveFeatures.ext': false,
    'main.competitiveFeatures.alrt': false,
    'main.competitiveFeatures.pbld': false,
    'main.competitiveFeatures.shad': false,
    'main.competitiveFeatures.ckfree': false,
    'main.competitiveFeatures.api': true,
    'main.competitiveFeatures.2fa': true,
  },
  Fathom: {
    'main.competitiveFeatures.gdpr': true,
    'main.competitiveFeatures.open': false,
    'main.competitiveFeatures.perf': false,
    'main.competitiveFeatures.usfl': false,
    'main.competitiveFeatures.funnels': false,
    'main.competitiveFeatures.sessionAnalysis': false,
    'main.competitiveFeatures.ext': false,
    'main.competitiveFeatures.alrt': true,
    'main.competitiveFeatures.pbld': true,
    'main.competitiveFeatures.shad': true,
    'main.competitiveFeatures.ckfree': true,
    'main.competitiveFeatures.api': true,
    'main.competitiveFeatures.2fa': true,
  },
  Plausible: {
    'main.competitiveFeatures.gdpr': true,
    'main.competitiveFeatures.open': true,
    'main.competitiveFeatures.perf': false,
    'main.competitiveFeatures.usfl': false,
    'main.competitiveFeatures.funnels': true,
    'main.competitiveFeatures.sessionAnalysis': false,
    'main.competitiveFeatures.ext': false,
    'main.competitiveFeatures.alrt': false,
    'main.competitiveFeatures.pbld': true,
    'main.competitiveFeatures.shad': true,
    'main.competitiveFeatures.ckfree': true,
    'main.competitiveFeatures.api': true,
    'main.competitiveFeatures.2fa': false,
  },
  'Simple Analytics': {
    'main.competitiveFeatures.gdpr': true,
    'main.competitiveFeatures.open': false,
    'main.competitiveFeatures.perf': false,
    'main.competitiveFeatures.usfl': false,
    'main.competitiveFeatures.funnels': false,
    'main.competitiveFeatures.sessionAnalysis': false,
    'main.competitiveFeatures.ext': false,
    'main.competitiveFeatures.alrt': false,
    'main.competitiveFeatures.pbld': true,
    'main.competitiveFeatures.shad': false,
    'main.competitiveFeatures.ckfree': true,
    'main.competitiveFeatures.api': true,
    'main.competitiveFeatures.2fa': false,
  },
}

interface IComparisonTable {
  className?: string
}

export const ComparisonTable = ({ className }: IComparisonTable) => {
  const { t } = useTranslation('common')

  return (
    <div className={cx('py-20 text-lg tracking-tight text-gray-50', className)}>
      <div className='mt-2 flex flex-col'>
        <div className='-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8'>
          <div className='inline-block min-w-full py-2 align-middle md:px-6 lg:px-8'>
            <div className='overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg'>
              <table className='w-full min-w-full divide-y divide-slate-500'>
                <thead className='bg-gray-100 dark:bg-slate-800'>
                  <tr>
                    <th className='sr-only'>{t('main.metric')}</th>
                    {_map(SWETRIX_AND_COMPETITORS_LIST, (item, key) => (
                      <th
                        scope='col'
                        key={key}
                        className='w-1/6 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-800 dark:text-gray-50 sm:pl-6'
                      >
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-300 bg-gray-50 dark:divide-slate-700 dark:bg-slate-800'>
                  {_map(COMPETITOR_FEATURE_TABLE.Swetrix, (_, key) => (
                    <tr key={key}>
                      <td className='w-1/6 px-3 py-4 text-sm text-slate-700 dark:text-gray-50 sm:pl-6'>{t(key)}</td>
                      {_map(SWETRIX_AND_COMPETITORS_LIST, (service) => (
                        <td key={`${key}-${service}`} className='w-1/6 px-3 py-4 text-sm text-gray-50 sm:pl-6'>
                          {COMPETITOR_FEATURE_TABLE[service][key] && (
                            <CheckIcon
                              className='h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-500'
                              aria-label={t('common.yes')}
                            />
                          )}
                          {!COMPETITOR_FEATURE_TABLE[service][key] && (
                            <XMarkIcon
                              className='h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-500'
                              aria-label={t('common.no')}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
