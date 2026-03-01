import {
  CodeIcon,
  CopyIcon,
  CheckIcon,
  DownloadIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import type { MetaFunction } from 'react-router'
import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'

import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { ToolsNav, ToolsNavMobile } from '~/components/ToolsNav'
import { isSelfhosted } from '~/lib/constants'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Select from '~/ui/Select'
import CodeBlock from '~/ui/CodeBlock'
import { Text } from '~/ui/Text'
import { FAQ } from '~/ui/FAQ'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  return [
    ...getTitle('Free Robots.txt Generator - Swetrix'),
    ...getDescription(
      'Create and validate robots.txt files for your website instantly. Control how search engines like Googlebot and Bingbot crawl your site.',
    ),
    ...getPreviewImage(),
  ]
}

export const sitemap: SitemapFunction = () => ({
  priority: 0.8,
  exclude: isSelfhosted,
})

export async function loader() {
  if (isSelfhosted) {
    return redirect('/login', 302)
  }

  return null
}

const FAQ_ITEMS = [
  {
    question: 'What is a robots.txt file?',
    answer:
      'A robots.txt file tells search engine crawlers which URLs the crawler can access on your site. This is used mainly to avoid overloading your site with requests; it is not a mechanism for keeping a web page out of Google. To keep a web page out of Google, block indexing with noindex or password-protect the page.',
  },
  {
    question: 'Where should I put my robots.txt file?',
    answer:
      'The robots.txt file must be placed at the root of your website host to which it applies. For example, to control crawling on all URLs below https://www.example.com/, the robots.txt file must be located at https://www.example.com/robots.txt.',
  },
  {
    question: 'What does "User-agent: *" mean?',
    answer:
      'The asterisk (*) is a wildcard that applies the rule to all web crawlers. So "User-agent: *" means the instructions that follow apply to every bot that visits your site.',
  },
  {
    question: 'Can I have multiple sitemaps in my robots.txt?',
    answer:
      'Yes! You can add as many "Sitemap: [URL]" directives as you need anywhere in your robots.txt file. This helps search engines discover all your XML sitemaps efficiently.',
  },
]

type RuleType = 'Allow' | 'Disallow'

interface Rule {
  type: RuleType
  path: string
}

interface AgentGroup {
  userAgent: string
  rules: Rule[]
  crawlDelay?: string
}

export default function RobotsTxtGenerator() {
  const [copied, setCopied] = useState(false)

  const [agentGroups, setAgentGroups] = useState<AgentGroup[]>([
    {
      userAgent: '*',
      rules: [
        { type: 'Disallow', path: '/admin/' },
        { type: 'Disallow', path: '/private/' },
      ],
      crawlDelay: '',
    },
  ])

  const [sitemapUrl, setSitemapUrl] = useState(
    'https://example.com/sitemap.xml',
  )

  const COMMON_AGENTS = [
    { value: '*', label: '* (All Crawlers)' },
    { value: 'Googlebot', label: 'Googlebot' },
    { value: 'Googlebot-Image', label: 'Googlebot-Image' },
    { value: 'Bingbot', label: 'Bingbot' },
    { value: 'Slurp', label: 'Slurp (Yahoo)' },
    { value: 'DuckDuckBot', label: 'DuckDuckBot' },
    { value: 'Baiduspider', label: 'Baiduspider' },
    { value: 'YandexBot', label: 'YandexBot' },
    { value: 'GPTBot', label: 'GPTBot (OpenAI)' },
    { value: 'CCBot', label: 'CCBot (Common Crawl)' },
  ]

  const generateRobotsTxt = () => {
    let output = ''

    agentGroups.forEach((group, index) => {
      if (index > 0) output += '\n'
      output += `User-agent: ${group.userAgent}\n`

      if (group.crawlDelay) {
        output += `Crawl-delay: ${group.crawlDelay}\n`
      }

      if (group.rules.length === 0) {
        output += 'Allow: /\n'
      } else {
        group.rules.forEach((rule) => {
          if (rule.path) {
            output += `${rule.type}: ${rule.path}\n`
          }
        })
      }
    })

    if (sitemapUrl) {
      output += `\nSitemap: ${sitemapUrl}\n`
    }

    return output
  }

  const generatedText = generateRobotsTxt()

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([generatedText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'robots.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const addAgentGroup = () => {
    setAgentGroups([
      ...agentGroups,
      { userAgent: '', rules: [{ type: 'Disallow', path: '' }] },
    ])
  }

  const updateAgentGroup = (
    index: number,
    field: keyof AgentGroup,
    value: any,
  ) => {
    const newGroups = [...agentGroups]
    newGroups[index] = { ...newGroups[index], [field]: value }
    setAgentGroups(newGroups)
  }

  const removeAgentGroup = (index: number) => {
    setAgentGroups(agentGroups.filter((_, i) => i !== index))
  }

  const addRule = (groupIndex: number) => {
    const newGroups = [...agentGroups]
    newGroups[groupIndex].rules.push({ type: 'Disallow', path: '' })
    setAgentGroups(newGroups)
  }

  const updateRule = (
    groupIndex: number,
    ruleIndex: number,
    field: keyof Rule,
    value: string,
  ) => {
    const newGroups = [...agentGroups]
    newGroups[groupIndex].rules[ruleIndex] = {
      ...newGroups[groupIndex].rules[ruleIndex],
      [field]: value,
    }
    setAgentGroups(newGroups)
  }

  const removeRule = (groupIndex: number, ruleIndex: number) => {
    const newGroups = [...agentGroups]
    newGroups[groupIndex].rules = newGroups[groupIndex].rules.filter(
      (_, i) => i !== ruleIndex,
    )
    setAgentGroups(newGroups)
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 xl:hidden' />

        <div className='xl:flex xl:items-start xl:gap-8'>
          <div className='min-w-0 xl:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              Robots.txt Generator
            </Text>
            <Text as='p' size='lg' colour='secondary' className='mt-4'>
              Easily generate a robots.txt file to control how search engines
              crawl your website.
            </Text>

            <div className='mt-12 grid gap-8 lg:grid-cols-2'>
              {/* Input Section */}
              <div className='space-y-6'>
                <div className='rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                  <h2 className='mb-4 text-xl font-semibold text-gray-900 dark:text-white'>
                    Global Settings
                  </h2>
                  <Input
                    type='url'
                    label='Sitemap URL'
                    placeholder='https://example.com/sitemap.xml'
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    className='w-full'
                  />
                </div>

                {agentGroups.map((group, groupIndex) => (
                  <div
                    key={groupIndex}
                    className='rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-900'
                  >
                    <div className='mb-4 flex items-center justify-between'>
                      <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
                        Crawler Rules {groupIndex + 1}
                      </h2>
                      {agentGroups.length > 1 && (
                        <button
                          type='button'
                          onClick={() => removeAgentGroup(groupIndex)}
                          className='text-sm text-red-500 hover:text-red-600'
                        >
                          Remove Group
                        </button>
                      )}
                    </div>

                    <div className='space-y-4'>
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='col-span-2 sm:col-span-1'>
                          <Select
                            label='User Agent'
                            items={COMMON_AGENTS}
                            title={
                              COMMON_AGENTS.find(
                                (a) => a.value === group.userAgent,
                              )?.label || 'Select preset...'
                            }
                            selectedItem={
                              COMMON_AGENTS.find(
                                (a) => a.value === group.userAgent,
                              ) || undefined
                            }
                            onSelect={(agent) => {
                              updateAgentGroup(
                                groupIndex,
                                'userAgent',
                                agent.value,
                              )
                            }}
                            labelExtractor={(agent) => agent.label}
                            keyExtractor={(agent) => agent.value}
                          />
                        </div>
                        <div className='col-span-2 sm:col-span-1'>
                          <Input
                            type='text'
                            label='Custom / Manual Input'
                            placeholder='CustomBot'
                            value={group.userAgent}
                            onChange={(e) =>
                              updateAgentGroup(
                                groupIndex,
                                'userAgent',
                                e.target.value,
                              )
                            }
                            className='w-full'
                          />
                        </div>
                      </div>

                      <Input
                        type='number'
                        label='Crawl Delay (seconds)'
                        placeholder='Leave empty for default'
                        value={group.crawlDelay}
                        onChange={(e) =>
                          updateAgentGroup(
                            groupIndex,
                            'crawlDelay',
                            e.target.value,
                          )
                        }
                        className='w-full'
                        min={1}
                      />

                      <div className='space-y-2 pt-2'>
                        <span className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                          Directory Rules
                        </span>
                        {group.rules.map((rule, ruleIndex) => (
                          <div
                            key={ruleIndex}
                            className='flex items-center gap-2'
                          >
                            <div className='w-full'>
                              <Select
                                items={['Disallow', 'Allow']}
                                selectedItem={rule.type}
                                title={rule.type}
                                onSelect={(val) =>
                                  updateRule(
                                    groupIndex,
                                    ruleIndex,
                                    'type',
                                    val as RuleType,
                                  )
                                }
                                labelExtractor={(val) => val}
                                buttonClassName='!py-2 !px-3'
                              />
                            </div>
                            <div className='flex-1'>
                              <Input
                                type='text'
                                placeholder='/path-to-block/'
                                value={rule.path}
                                onChange={(e) =>
                                  updateRule(
                                    groupIndex,
                                    ruleIndex,
                                    'path',
                                    e.target.value,
                                  )
                                }
                                className='w-full'
                              />
                            </div>
                            <button
                              type='button'
                              onClick={() => removeRule(groupIndex, ruleIndex)}
                              className='shrink-0 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-slate-700 dark:hover:text-gray-300'
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <Button
                          type='button'
                          secondary
                          onClick={() => addRule(groupIndex)}
                          className='mt-2 w-full text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700'
                        >
                          + Add path rule
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type='button'
                  primary
                  onClick={addAgentGroup}
                  className='w-full'
                >
                  + Add User Agent Group
                </Button>
              </div>

              {/* Code Output Section */}
              <div className='flex h-[600px] flex-col rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800 lg:sticky lg:top-8'>
                <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <CodeIcon className='h-5 w-5 text-gray-400' />
                    <h3 className='text-lg font-medium text-white'>
                      robots.txt
                    </h3>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      secondary
                      onClick={handleCopy}
                      className='h-auto! border-slate-700! bg-slate-800! px-3! py-1.5! text-gray-300! hover:bg-slate-700! hover:text-white!'
                    >
                      {copied ? (
                        <CheckIcon className='mr-1.5 h-4 w-4 text-emerald-400' />
                      ) : (
                        <CopyIcon className='mr-1.5 h-4 w-4' />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      secondary
                      onClick={handleDownload}
                      className='h-auto! border-slate-700! bg-slate-800! px-3! py-1.5! text-gray-300! hover:bg-slate-700! hover:text-white!'
                    >
                      <DownloadIcon className='mr-1.5 h-4 w-4' />
                      Download
                    </Button>
                  </div>
                </div>

                <div className='flex-1 overflow-auto rounded-lg'>
                  <CodeBlock code={generatedText} />
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-800'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                About Robots.txt
              </Text>
              <Text
                as='p'
                size='lg'
                colour='secondary'
                className='mt-4 leading-relaxed'
              >
                A robots.txt file gives instructions about your site to web
                robots; this is called The Robots Exclusion Protocol.
              </Text>

              <div className='mt-12'>
                <h3 className='mb-8 text-2xl font-bold text-gray-900 dark:text-white'>
                  Frequently Asked Questions
                </h3>

                <FAQ items={FAQ_ITEMS} withStructuredData />
              </div>
            </section>

            <DitchGoogle />
          </div>

          <aside className='hidden xl:sticky xl:top-12 xl:block xl:w-64 xl:shrink-0 xl:self-start'>
            <ToolsNav />
          </aside>
        </div>
      </main>
    </div>
  )
}
