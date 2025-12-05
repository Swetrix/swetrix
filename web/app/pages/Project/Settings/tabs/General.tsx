import React from 'react'
import { useTranslation } from 'react-i18next'

import Input from '~/ui/Input'

interface GeneralProps {
  form: {
    name?: string
    id?: string
  }
  errors: {
    name?: string
  }
  beenSubmitted: boolean
  handleInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  sharableLink: string
}

const General = ({ form, errors, beenSubmitted, handleInput, sharableLink }: GeneralProps) => {
  const { t } = useTranslation('common')

  return (
    <>
      <h3 className='text-lg font-bold text-gray-900 dark:text-gray-50'>{t('profileSettings.general')}</h3>
      <Input
        name='name'
        label={t('project.settings.name')}
        value={form.name}
        placeholder='My awesome project'
        className='mt-2'
        onChange={handleInput}
        error={beenSubmitted ? errors.name : null}
      />
      <Input
        name='id'
        label={t('project.settings.pid')}
        value={form.id}
        className='mt-4'
        onChange={handleInput}
        error={null}
        disabled
      />
      <Input
        name='sharableLink'
        label={t('project.settings.sharableLink')}
        hint={t('project.settings.sharableDesc')}
        value={sharableLink}
        className='mt-4'
        onChange={handleInput}
        error={null}
        disabled
      />
    </>
  )
}

export default General
