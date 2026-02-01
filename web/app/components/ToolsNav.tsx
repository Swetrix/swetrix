import {
  GlobeIcon,
  CalculatorIcon,
  CursorClickIcon,
  LinkIcon,
  FileMagnifyingGlassIcon,
  CaretDownIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'

import { cn } from '~/utils/generic'

export const TOOLS = [
  {
    id: 'ip-lookup',
    title: 'IP Lookup',
    description: 'Find your IP address and geolocation data',
    href: '/tools/ip-lookup',
    icon: GlobeIcon,
  },
  {
    id: 'roi-calculator',
    title: 'ROI Calculator',
    description: 'Calculate ROAS, ROI, CAC, and other metrics',
    href: '/tools/roi-calculator',
    icon: CalculatorIcon,
  },
  {
    id: 'ctr-calculator',
    title: 'CTR Calculator',
    description: 'Calculate your Click-Through Rate',
    href: '/tools/ctr-calculator',
    icon: CursorClickIcon,
  },
  {
    id: 'utm-generator',
    title: 'UTM Generator',
    description: 'Create trackable URLs with UTM parameters',
    href: '/tools/utm-generator',
    icon: LinkIcon,
  },
  {
    id: 'sitemap-validator',
    title: 'Sitemap Validator',
    description: 'Validate your sitemap.xml for errors',
    href: '/tools/sitemap-validator',
    icon: FileMagnifyingGlassIcon,
  },
] as const

interface ToolsNavProps {
  className?: string
}

export function ToolsNav({ className }: ToolsNavProps) {
  const location = useLocation()

  return (
    <nav
      className={cn(
        'overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700',
        className,
      )}
    >
      {TOOLS.map((tool, index) => {
        const isActive = location.pathname === tool.href
        const Icon = tool.icon

        return (
          <Link
            key={tool.id}
            to={tool.href}
            className={cn(
              'flex items-start gap-3 px-4 py-3 transition-colors',
              index !== 0 && 'border-t border-gray-100 dark:border-slate-700',
              isActive
                ? 'bg-gray-50 dark:bg-slate-700/50'
                : 'hover:bg-gray-50 dark:hover:bg-slate-700/30',
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0',
                isActive
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-400 dark:text-gray-500',
              )}
            />
            <div className='min-w-0'>
              <p
                className={cn(
                  'text-sm font-medium',
                  isActive
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-300',
                )}
              >
                {tool.title}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {tool.description}
              </p>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}

export function ToolsNavMobile({ className }: ToolsNavProps) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  const currentTool = TOOLS.find((tool) => tool.href === location.pathname)
  const CurrentIcon = currentTool?.icon

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 dark:bg-slate-800 dark:ring-slate-700',
        className,
      )}
    >
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='flex w-full items-center justify-between gap-3 px-4 py-3'
      >
        <div className='flex items-center gap-3'>
          {CurrentIcon && (
            <CurrentIcon className='h-5 w-5 shrink-0 text-gray-900 dark:text-white' />
          )}
          <div className='text-left'>
            <p className='text-sm font-medium text-gray-900 dark:text-white'>
              {currentTool?.title || 'Tools'}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              {currentTool?.description || 'Select a tool'}
            </p>
          </div>
        </div>
        <CaretDownIcon
          className={cn(
            'h-5 w-5 shrink-0 text-gray-400 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className='border-t border-gray-100 dark:border-slate-700'>
          {TOOLS.filter((tool) => tool.href !== location.pathname).map(
            (tool, index) => {
              const Icon = tool.icon

              return (
                <Link
                  key={tool.id}
                  to={tool.href}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30',
                    index !== 0 &&
                      'border-t border-gray-100 dark:border-slate-700',
                  )}
                >
                  <Icon className='mt-0.5 h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500' />
                  <div className='min-w-0'>
                    <p className='text-sm font-medium text-gray-600 dark:text-gray-300'>
                      {tool.title}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {tool.description}
                    </p>
                  </div>
                </Link>
              )
            },
          )}
        </div>
      )}
    </div>
  )
}
