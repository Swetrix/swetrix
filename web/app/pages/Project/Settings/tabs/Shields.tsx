import _filter from 'lodash/filter'
import _includes from 'lodash/includes'
import _toUpper from 'lodash/toUpper'
import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import Flag from '~/ui/Flag'
import Input from '~/ui/Input'
import MultiSelect from '~/ui/MultiSelect'
import Select from '~/ui/Select'
import { Text } from '~/ui/Text'
import countries from '~/utils/isoCountries'

interface BotsProtectionLevelOption {
  name: string
  title: string
  description: string
}

interface ShieldsProps {
  form: {
    origins: string | null
    ipBlacklist: string | null
    botsProtectionLevel?: string
    countryBlacklist?: string[]
  }
  errors: {
    origins?: string
    ipBlacklist?: string
  }
  beenSubmitted: boolean
  handleInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  botsProtectionLevels: readonly BotsProtectionLevelOption[]
  setBotsLevel: (name: string) => void
  countryBlacklist: string[]
  setCountryBlacklist: (countries: string[]) => void
}

const Shields = ({
  form,
  errors,
  beenSubmitted,
  handleInput,
  botsProtectionLevels,
  setBotsLevel,
  countryBlacklist,
  setCountryBlacklist,
}: ShieldsProps) => {
  const {
    t,
    i18n: { language },
  } = useTranslation('common')

  // Get all country codes
  const allCountries = useMemo(() => {
    const countryCodes = Object.keys(countries.getAlpha2Codes())
    return countryCodes.sort((a, b) => {
      const nameA = countries.getName(a, language) || a
      const nameB = countries.getName(b, language) || b
      return nameA.localeCompare(nameB)
    })
  }, [language])

  const [searchedCountries, setSearchedCountries] =
    useState<string[]>(allCountries)

  const handleCountrySearch = (search: string) => {
    if (search.length > 0) {
      setSearchedCountries(
        _filter(allCountries, (cc) => {
          const countryName = countries.getName(cc, language) || cc
          return (
            _includes(_toUpper(countryName), _toUpper(search)) ||
            _includes(_toUpper(cc), _toUpper(search))
          )
        }),
      )
    } else {
      setSearchedCountries(allCountries)
    }
  }

  const handleCountrySelect = (cc: string) => {
    if (_includes(countryBlacklist, cc)) {
      setCountryBlacklist(_filter(countryBlacklist, (c) => c !== cc))
    } else {
      setCountryBlacklist([...countryBlacklist, cc])
    }
  }

  const handleCountryRemove = (cc: string) => {
    setCountryBlacklist(_filter(countryBlacklist, (c) => c !== cc))
  }

  const renderCountryOption = (cc: string) => (
    <div className='flex items-center gap-2'>
      <Flag
        className='rounded-xs'
        country={cc}
        size={21}
        alt=''
        aria-hidden='true'
      />
      <span>{countries.getName(cc, language) || cc}</span>
      <span className='text-gray-400'>{cc}</span>
    </div>
  )

  return (
    <>
      <Text as='h3' size='lg' weight='bold'>
        {t('project.settings.shields')}
      </Text>
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
        <Text
          as='label'
          size='sm'
          weight='medium'
          colour='secondary'
          className='block'
        >
          {t('project.settings.countryBlacklist')}
        </Text>
        <MultiSelect
          className='mt-1'
          items={searchedCountries}
          labelExtractor={renderCountryOption as any}
          itemExtractor={renderCountryOption as any}
          keyExtractor={(cc) => cc}
          label={countryBlacklist}
          onSearch={handleCountrySearch}
          placeholder={t('project.settings.selectCountry')}
          onSelect={handleCountrySelect}
          onRemove={handleCountryRemove}
          hint={t('project.settings.countryBlacklistHint')}
        />
      </div>
      <div className='mt-4'>
        <Select<BotsProtectionLevelOption>
          id='botsProtectionLevel'
          label={t('project.settings.botsProtectionLevel.title')}
          items={botsProtectionLevels}
          title={
            botsProtectionLevels.find(
              (predicate) => predicate.name === form.botsProtectionLevel,
            )?.title || ''
          }
          description={
            botsProtectionLevels.find(
              (predicate) => predicate.name === form.botsProtectionLevel,
            )?.description || ''
          }
          labelExtractor={(item) => item.title}
          descriptionExtractor={(item) => item.description}
          keyExtractor={(item) => item.name}
          onSelect={(item) => setBotsLevel(item.name)}
          wrap
          selectedItem={botsProtectionLevels.find(
            (predicate) => predicate.name === form.botsProtectionLevel,
          )}
        />
      </div>
    </>
  )
}

export default Shields
