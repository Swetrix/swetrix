import React from 'react'
import { useTranslation } from 'react-i18next'

import { isSelfhosted } from '~/lib/constants'
import Checkbox from '~/ui/Checkbox'
import Select from '~/ui/Select'

interface AccessSettingsProps {
  form: {
    active?: boolean
    public?: boolean
    isPasswordProtected?: boolean
    organisationId?: string
  }
  setForm: (updater: (prev: any) => any) => void
  organisations: { id?: string; name: string }[]
  onAssignOrganisation: (id?: string) => Promise<void>
  openPasswordModal: () => void
}

const AccessSettings = ({
  form,
  setForm,
  organisations,
  onAssignOrganisation,
  openPasswordModal,
}: AccessSettingsProps) => {
  const { t } = useTranslation('common')

  return (
    <>
      <h3 className='text-lg font-bold text-gray-900 dark:text-gray-50'>{t('project.settings.access')}</h3>
      <Checkbox
        checked={Boolean(form.active)}
        onChange={(checked) =>
          setForm((prev: any) => ({
            ...prev,
            active: checked,
          }))
        }
        name='active'
        classes={{
          label: 'mt-2',
        }}
        label={t('project.settings.enabled')}
        hint={t('project.settings.enabledHint')}
      />
      <Checkbox
        checked={Boolean(form.public)}
        onChange={(checked) => {
          if (!form.isPasswordProtected || !checked) {
            setForm((prev: any) => ({
              ...prev,
              public: checked,
            }))
          }
        }}
        name='public'
        classes={{
          label: 'mt-4',
        }}
        label={t('project.settings.public')}
        hint={t('project.settings.publicHint')}
      />
      <Checkbox
        checked={Boolean(form.isPasswordProtected)}
        onChange={(checked) => {
          if (!checked) {
            setForm((prev: any) => ({
              ...prev,
              isPasswordProtected: false,
            }))
            return
          }

          if (!form.public) {
            openPasswordModal()
          }
        }}
        name='isPasswordProtected'
        classes={{
          label: 'mt-4',
        }}
        label={t('project.settings.protected')}
        hint={t('project.settings.protectedHint')}
      />
      {!isSelfhosted && organisations.length > 1 ? (
        <div className='mt-4'>
          <Select
            items={organisations}
            keyExtractor={(item) => item.id || 'not-set'}
            labelExtractor={(item) => {
              if (item.id === undefined) {
                return <span className='italic'>{t('common.notSet')}</span>
              }

              return item.name
            }}
            onSelect={async (item) => {
              await onAssignOrganisation(item.id)
              setForm((oldForm: any) => ({
                ...oldForm,
                organisationId: item.id,
              }))
            }}
            label={t('project.settings.organisation')}
            title={organisations.find((org) => org.id === form.organisationId)?.name}
            selectedItem={organisations.find((org) => org.id === form.organisationId)}
          />
        </div>
      ) : null}
    </>
  )
}

export default AccessSettings
