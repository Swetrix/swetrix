import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'

import { isSelfhosted } from '~/lib/constants'
import {
  DEFAULT_TRACKING_SETTINGS,
  type Project,
  type TrackingSettings,
} from '~/lib/models/Project'
import type { ProjectSettingsActionData } from '~/routes/projects.settings.$id'
import { Link } from '~/ui/Link'
import ManagedTrackingSnippet from '~/ui/ManagedTrackingSnippet'
import { Switch } from '~/ui/Switch'
import { Text } from '~/ui/Text'

const TrackingScript = ({ project }: { project: Project }) => {
  const { t } = useTranslation('common')
  const fetcher = useFetcher<ProjectSettingsActionData>()
  const settings = project.trackingSettings ?? DEFAULT_TRACKING_SETTINGS
  const saving = fetcher.state !== 'idle'
  const pendingField = saving && fetcher.formData?.get('field')
  const replayUnavailable = !project.canTrackSessionReplay

  const renderSetting = (field: keyof TrackingSettings) => {
    const id = `tracking-${field}`
    const checked =
      pendingField === field
        ? fetcher.formData?.get('value') === 'true'
        : settings[field]
    const disabled =
      saving ||
      (field === 'sessionReplay' &&
        replayUnavailable &&
        !settings.sessionReplay)

    return (
      <div className='flex items-center justify-between gap-5 px-2 py-3'>
        <label
          htmlFor={id}
          className={disabled ? 'flex-1' : 'flex-1 cursor-pointer'}
        >
          <Text size='sm' weight='medium' className='block'>
            {t(`project.settings.tracking.${field}.label`)}
          </Text>
          <Text size='sm' colour='secondary' className='mt-0.5 block'>
            {t(`project.settings.tracking.${field}.hint`)}
          </Text>
        </label>
        <Switch
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={(enabled) =>
            fetcher.submit(
              {
                intent: 'update-tracking-setting',
                field,
                value: String(enabled),
              },
              { method: 'post' },
            )
          }
        />
      </div>
    )
  }

  return (
    <div className='max-w-2xl space-y-8'>
      <section>
        <Text as='h3' size='lg' weight='semibold'>
          {t('project.settings.tracking.install')}
        </Text>
        <Text as='p' size='sm' colour='secondary' className='mt-1 mb-3'>
          {t('project.settings.tracking.installHint')}
        </Text>
        <ManagedTrackingSnippet projectId={project.id} />
        <Text as='p' size='xs' colour='muted' className='mt-2'>
          {t('project.settings.tracking.propagation')}
        </Text>
      </section>

      <section>
        <Text as='h3' size='lg' weight='semibold'>
          {t('project.settings.tracking.core')}
        </Text>
        <div className='-mx-2 mt-1 divide-y divide-gray-200 dark:divide-slate-800'>
          {renderSetting('pageviews')}
          {renderSetting('errors')}
        </div>
      </section>

      <section>
        <Text as='h3' size='lg' weight='semibold'>
          {t('project.settings.tracking.autoCapture')}
        </Text>
        <div className='-mx-2 mt-1'>{renderSetting('outboundLinks')}</div>
      </section>

      <section>
        <Text as='h3' size='lg' weight='semibold'>
          {t('project.settings.tabs.sessionReplays')}
        </Text>
        <div className='-mx-2 mt-1'>{renderSetting('sessionReplay')}</div>
        {replayUnavailable && (
          <Text as='p' size='sm' colour='secondary' className='mb-2'>
            {t(
              isSelfhosted
                ? 'project.settings.tracking.replayStorage'
                : 'project.settings.tracking.replayUnavailable',
            )}
          </Text>
        )}
        <Text as='p' size='sm' colour='secondary'>
          {t('project.settings.tracking.consent')}{' '}
          <Link
            to='?tab=sessionReplays'
            className='underline decoration-dashed underline-offset-2 hover:decoration-solid'
          >
            {t('project.settings.tracking.retention')}
          </Link>
        </Text>
      </section>
      <output className='block'>
        {saving ? (
          <Text size='sm' colour='muted'>
            {t('project.settings.tracking.saving')}
          </Text>
        ) : fetcher.data?.error ? (
          <Text size='sm' colour='error'>
            {fetcher.data.error}
          </Text>
        ) : fetcher.data?.success ? (
          <Text size='sm' colour='secondary'>
            {t('project.settings.tracking.saved')}
          </Text>
        ) : null}
      </output>
    </div>
  )
}

export default TrackingScript
