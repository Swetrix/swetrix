import React from 'react'
import { useTranslation } from 'react-i18next'

import Input from '~/ui/Input'
import Select from '~/ui/Select'

interface ShieldsProps {
  form: {
    origins: string | null
    ipBlacklist: string | null
    botsProtectionLevel?: string
  }
  errors: {
    origins?: string
    ipBlacklist?: string
  }
  beenSubmitted: boolean
  handleInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  botsProtectionLevels: readonly { name: string; title: string }[]
  setBotsLevel: (name: string) => void
}

const Shields = ({ form, errors, beenSubmitted, handleInput, botsProtectionLevels, setBotsLevel }: ShieldsProps) => {
  const { t } = useTranslation('common')

  return (
    <>
      <h3 className='text-lg font-bold text-gray-900 dark:text-gray-50'>{t('project.settings.shields')}</h3>
      <Input
        name='origins'
        label={t('project.settings.origins')}
        hint={t('project.settings.originsHint')}
        value={form.origins || ''}
        className='mt-2'
        onChange={handleInput}
        error={beenSubmitted ? errors.origins : null}
      />
      <Input
        name='ipBlacklist'
        label={t('project.settings.ipBlacklist')}
        hint={t('project.settings.ipBlacklistHint')}
        value={form.ipBlacklist || ''}
        className='mt-4'
        onChange={handleInput}
        error={beenSubmitted ? errors.ipBlacklist : null}
      />
      <div className='mt-4'>
        <Select
          id='botsProtectionLevel'
          label={t('project.settings.botsProtectionLevel.title')}
          // @ts-expect-error
          items={botsProtectionLevels}
          title={botsProtectionLevels.find((predicate) => predicate.name === form.botsProtectionLevel)?.title || ''}
          labelExtractor={(item: any) => item.title}
          onSelect={(item) => setBotsLevel(item.name)}
          capitalise
        />
      </div>
    </>
  )
}

export default Shields
