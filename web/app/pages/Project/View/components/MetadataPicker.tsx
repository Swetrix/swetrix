import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react'
import {
  CaretDownIcon,
  CheckIcon,
  CursorClickIcon,
  MagnifyingGlassIcon,
  TagIcon,
} from '@phosphor-icons/react'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { panelControlClasses } from './PanelHeader'

type MetadataMode = 'property' | 'customEvent'

interface MetadataOption {
  mode: MetadataMode
  key: string
}

interface MetadataPickerProps {
  propertyKeys: string[]
  eventKeys: string[]
  activeMode: MetadataMode
  activeKey: string
  onSelect: (mode: MetadataMode, key: string) => void
}

export const MetadataPicker = ({
  propertyKeys,
  eventKeys,
  activeMode,
  activeKey,
  onSelect,
}: MetadataPickerProps) => {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')
  const id = useId()
  const focusFrame = useRef<number | null>(null)
  const focusSearchInput = useCallback((input: HTMLInputElement | null) => {
    if (focusFrame.current !== null) {
      cancelAnimationFrame(focusFrame.current)
      focusFrame.current = null
    }
    if (input) {
      focusFrame.current = requestAnimationFrame(() => {
        focusFrame.current = null
        input.focus({ preventScroll: true })
      })
    }
  }, [])
  const groups = useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    return [
      {
        mode: 'property' as const,
        label: t('project.pageProperties'),
        keys: propertyKeys,
      },
      {
        mode: 'customEvent' as const,
        label: t('project.customEvents'),
        keys: eventKeys,
      },
    ].map((group) => ({
      ...group,
      keys: group.keys.filter((key) =>
        `${group.label} ${key}`.toLocaleLowerCase().includes(search),
      ),
    }))
  }, [propertyKeys, eventKeys, query, t])
  const sourceLabel =
    activeMode === 'property' ? t('project.property') : t('project.customEvent')
  const SourceIcon = activeMode === 'property' ? TagIcon : CursorClickIcon

  return (
    <Popover className='max-w-full min-w-0'>
      {({ close }) => (
        <>
          <PopoverButton
            className={`${panelControlClasses(true)} max-w-full gap-1.5`}
            onClick={() => setQuery('')}
            disabled={!propertyKeys.length && !eventKeys.length}
            aria-label={`${t('project.metadata')}: ${sourceLabel}${activeKey ? `: ${activeKey}` : ''}`}
            title={
              activeKey ? `${sourceLabel}: ${activeKey}` : t('project.metadata')
            }
          >
            <SourceIcon
              className='size-4 shrink-0 text-gray-500 dark:text-gray-400'
              aria-hidden
            />
            <span className='shrink-0 font-medium text-gray-500 dark:text-gray-400'>
              {activeKey ? `${sourceLabel}:` : t('project.metadata')}
            </span>
            {activeKey ? <span className='truncate'>{activeKey}</span> : null}
            <CaretDownIcon className='size-4 shrink-0' aria-hidden />
          </PopoverButton>
          <PopoverPanel
            anchor={{ to: 'bottom start', gap: 6, padding: 12 }}
            modal={false}
            transition
            className='z-50 w-80 max-w-[calc(100vw-1.5rem)] origin-top-left rounded-lg bg-white p-1 shadow-lg ring-1 ring-gray-200/80 transition-[opacity,transform] duration-150 ease-out-quint focus:outline-hidden data-closed:scale-95 data-closed:opacity-0 data-leave:duration-100 motion-reduce:transition-none dark:bg-slate-900 dark:ring-slate-700/60'
          >
            <Combobox
              value={{ mode: activeMode, key: activeKey }}
              by={(a: MetadataOption, b: MetadataOption) =>
                a?.mode === b?.mode && a?.key === b?.key
              }
              onChange={(option: MetadataOption | null) => {
                if (!option) return
                onSelect(option.mode, option.key)
                close()
              }}
              onClose={() => close()}
              immediate
            >
              <div className='relative mb-1 border-b border-gray-100 dark:border-slate-800'>
                <MagnifyingGlassIcon
                  className='pointer-events-none absolute top-2.5 left-2 size-4 text-gray-400'
                  aria-hidden
                />
                <ComboboxInput
                  ref={focusSearchInput}
                  aria-label={t('project.searchMetadata')}
                  placeholder={t('project.searchMetadata')}
                  displayValue={() => query}
                  onChange={(event) => setQuery(event.target.value)}
                  className='w-full border-0 bg-transparent py-2 pr-2 pl-8 text-sm text-gray-900 outline-hidden placeholder:text-gray-400 focus:ring-0 dark:text-gray-50'
                />
              </div>
              <ComboboxOptions
                static
                modal={false}
                className='max-h-72 overflow-y-auto overscroll-contain outline-hidden'
              >
                {groups.map((group) =>
                  group.keys.length ? (
                    <fieldset
                      key={group.mode}
                      className='m-0 min-w-0 border-0 p-0'
                      aria-labelledby={`${id}-${group.mode}`}
                    >
                      <legend
                        id={`${id}-${group.mode}`}
                        className='px-2 pt-2 pb-1 text-xs font-medium text-gray-500 dark:text-gray-400'
                      >
                        {group.label}
                      </legend>
                      {group.keys.map((key) => (
                        <ComboboxOption
                          key={key}
                          value={{ mode: group.mode, key }}
                          className='group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 transition-colors duration-100 ease-out select-none data-focus:bg-gray-100 data-focus:text-gray-900 dark:text-gray-200 dark:data-focus:bg-slate-800 dark:data-focus:text-white'
                        >
                          <span className='min-w-0 flex-1 wrap-break-word'>
                            {key}
                          </span>
                          <CheckIcon
                            className='invisible size-4 shrink-0 group-data-selected:visible'
                            aria-hidden
                          />
                        </ComboboxOption>
                      ))}
                    </fieldset>
                  ) : null,
                )}
                {groups.every((group) => !group.keys.length) ? (
                  <p className='px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400'>
                    {t('common.nothingFound')}
                  </p>
                ) : null}
              </ComboboxOptions>
            </Combobox>
          </PopoverPanel>
        </>
      )}
    </Popover>
  )
}
