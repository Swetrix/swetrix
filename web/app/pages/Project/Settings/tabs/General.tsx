import React from 'react'
import { useTranslation } from 'react-i18next'

import Input from '~/ui/Input'
import { Text } from '~/ui/Text'

interface GeneralProps {
  form: {
    name?: string
    id?: string
    websiteUrl?: string | null
    brandKeywords?: string
  }
  errors: {
    name?: string
    websiteUrl?: string
  }
  beenSubmitted: boolean
  handleInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void
}

const General = ({
  form,
  errors,
  beenSubmitted,
  handleInput,
  handleBlur,
}: GeneralProps) => {
  const { t } = useTranslation('common')

  return (
    <>
      <Text as='h3' size='lg' weight='bold'>
        {t('profileSettings.general')}
      </Text>
      <Input
        name='name'
        label={t('project.settings.name')}
        hint={t('project.settings.nameHint')}
        value={form.name}
        placeholder='My awesome project'
        className='mt-2'
        onChange={handleInput}
        onBlur={handleBlur}
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
        name='websiteUrl'
        label={t('project.settings.websiteUrl')}
        hint={t('project.settings.websiteUrlHint')}
        value={form.websiteUrl || ''}
        placeholder={t('project.settings.websiteUrlPlaceholder')}
        className='mt-4'
        onChange={handleInput}
        onBlur={handleBlur}
        error={beenSubmitted ? errors.websiteUrl : null}
      />
      <Input
        name='brandKeywords'
        label={t('project.settings.brandKeywords')}
        hint={t('project.settings.brandKeywordsHint')}
        value={form.brandKeywords || ''}
        placeholder={t('project.settings.brandKeywordsPlaceholder')}
        className='mt-4'
        onChange={handleInput}
        onBlur={handleBlur}
        error={null}
      />
    </>
  )
}

export default General
