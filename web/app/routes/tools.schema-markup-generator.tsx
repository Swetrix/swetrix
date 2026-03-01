import { CodeIcon, CopyIcon, CheckIcon } from '@phosphor-icons/react'
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
import Textarea from '~/ui/Textarea'
import CodeBlock from '~/ui/CodeBlock'
import { Text } from '~/ui/Text'
import { FAQ } from '~/ui/FAQ'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  return [
    ...getTitle('Free Schema Markup (JSON-LD) Generator - Swetrix'),
    ...getDescription(
      'Generate valid JSON-LD schema markup for your website to get rich snippets in Google search results. Supports Article, FAQ, Local Business, and more.',
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
    question: 'What is Schema Markup?',
    answer:
      'Schema markup (also known as structured data) is a standardized format for providing information about a page and classifying the page content. It helps search engines like Google understand the context of your page, which can lead to rich snippets in search results.',
  },
  {
    question: 'What is JSON-LD?',
    answer:
      'JSON-LD (JavaScript Object Notation for Linked Data) is a lightweight Linked Data format. It is the format recommended by Google for implementing schema markup because it is easy to read, write, and maintain compared to other formats like Microdata or RDFa.',
  },
  {
    question: 'How do I add JSON-LD to my website?',
    answer:
      'Once you generate the JSON-LD code using this tool, simply copy and paste it into the <head> or <body> section of the HTML of the page you want the structured data to apply to.',
  },
  {
    question: 'Will schema markup guarantee rich snippets?',
    answer:
      'No, adding schema markup does not guarantee that search engines will display rich snippets for your pages. However, it is a prerequisite. Google decides when to show rich snippets based on various factors including relevance and site quality.',
  },
]

type SchemaType = 'Article' | 'FAQPage' | 'Organization'

export default function SchemaMarkupGenerator() {
  const [schemaType, setSchemaType] = useState<SchemaType>('Article')
  const [copied, setCopied] = useState(false)

  // Article state
  const [articleData, setArticleData] = useState({
    type: 'Article',
    headline: 'Understanding Web Analytics in 2026',
    image: 'https://example.com/analytics-banner.jpg',
    authorType: 'Person',
    authorName: 'John Doe',
    publisherName: 'Swetrix',
    publisherLogo: 'https://swetrix.com/logo.png',
    datePublished: new Date().toISOString().slice(0, 16),
    dateModified: new Date().toISOString().slice(0, 16),
  })

  // Organization state
  const [orgData, setOrgData] = useState({
    name: 'Swetrix',
    url: 'https://swetrix.com',
    logo: 'https://swetrix.com/logo.png',
    description: 'Privacy-focused, cookie-less web analytics platform.',
  })

  // FAQ state
  const [faqData, setFaqData] = useState([
    {
      question: 'Is Swetrix GDPR compliant?',
      answer:
        'Yes, Swetrix is built from the ground up to be fully GDPR, CCPA, and PECR compliant. We do not use cookies or collect any personal data.',
    },
  ])

  const generateJSONLD = () => {
    let schema: any = {
      '@context': 'https://schema.org',
    }

    if (schemaType === 'Article') {
      schema['@type'] = articleData.type
      if (articleData.headline) schema.headline = articleData.headline
      if (articleData.image) schema.image = [articleData.image]
      if (articleData.datePublished)
        schema.datePublished = new Date(articleData.datePublished).toISOString()
      if (articleData.dateModified)
        schema.dateModified = new Date(articleData.dateModified).toISOString()

      if (articleData.authorName) {
        schema.author = [
          {
            '@type': articleData.authorType,
            name: articleData.authorName,
          },
        ]
      }

      if (articleData.publisherName) {
        schema.publisher = {
          '@type': 'Organization',
          name: articleData.publisherName,
          ...(articleData.publisherLogo && {
            logo: {
              '@type': 'ImageObject',
              url: articleData.publisherLogo,
            },
          }),
        }
      }
    } else if (schemaType === 'Organization') {
      schema['@type'] = 'Organization'
      if (orgData.name) schema.name = orgData.name
      if (orgData.url) schema.url = orgData.url
      if (orgData.logo) schema.logo = orgData.logo
      if (orgData.description) schema.description = orgData.description
    } else if (schemaType === 'FAQPage') {
      schema['@type'] = 'FAQPage'
      schema.mainEntity = faqData
        .filter((q) => q.question && q.answer)
        .map((q) => ({
          '@type': 'Question',
          name: q.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: q.answer,
          },
        }))
    }

    return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`
  }

  const generatedCode = generateJSONLD()

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 xl:hidden' />

        <div className='xl:flex xl:items-start xl:gap-8'>
          <div className='min-w-0 xl:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              Schema Markup Generator
            </Text>
            <Text as='p' size='lg' colour='secondary' className='mt-4'>
              Generate valid JSON-LD structured data to improve your SEO and get
              rich snippets.
            </Text>

            <div className='mt-12 grid gap-8 lg:grid-cols-2'>
              {/* Input Section */}
              <div className='rounded-lg bg-white p-6 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                <div className='mb-6'>
                  <Select
                    label='Schema Type'
                    selectedItem={schemaType}
                    title={
                      schemaType === 'Article'
                        ? 'Article / Blog Post'
                        : schemaType === 'FAQPage'
                          ? 'FAQ Page'
                          : 'Organization / Brand'
                    }
                    onSelect={(val) => setSchemaType(val as SchemaType)}
                    labelExtractor={(val) =>
                      val === 'Article'
                        ? 'Article / Blog Post'
                        : val === 'FAQPage'
                          ? 'FAQ Page'
                          : 'Organization / Brand'
                    }
                    items={['Article', 'FAQPage', 'Organization']}
                  />
                </div>

                <div className='space-y-4'>
                  {schemaType === 'Article' && (
                    <>
                      <div className='grid grid-cols-2 gap-4'>
                        <Select
                          label='Article Type'
                          selectedItem={articleData.type}
                          title={
                            articleData.type === 'NewsArticle'
                              ? 'News Article'
                              : articleData.type === 'BlogPosting'
                                ? 'Blog Post'
                                : 'Article'
                          }
                          onSelect={(val) =>
                            setArticleData((p) => ({
                              ...p,
                              type: val as string,
                            }))
                          }
                          labelExtractor={(val) =>
                            val === 'NewsArticle'
                              ? 'News Article'
                              : val === 'BlogPosting'
                                ? 'Blog Post'
                                : 'Article'
                          }
                          items={['Article', 'NewsArticle', 'BlogPosting']}
                        />
                        <Input
                          type='text'
                          label='Headline'
                          value={articleData.headline}
                          onChange={(e) =>
                            setArticleData((p) => ({
                              ...p,
                              headline: e.target.value,
                            }))
                          }
                          className='w-full'
                        />
                      </div>

                      <Input
                        type='text'
                        label='Image URL'
                        value={articleData.image}
                        onChange={(e) =>
                          setArticleData((p) => ({
                            ...p,
                            image: e.target.value,
                          }))
                        }
                        className='w-full'
                      />

                      <div className='grid grid-cols-2 gap-4'>
                        <Select
                          label='Author Type'
                          selectedItem={articleData.authorType}
                          title={articleData.authorType}
                          onSelect={(val) =>
                            setArticleData((p) => ({
                              ...p,
                              authorType: val as string,
                            }))
                          }
                          items={['Person', 'Organization']}
                        />
                        <Input
                          type='text'
                          label='Author Name'
                          value={articleData.authorName}
                          onChange={(e) =>
                            setArticleData((p) => ({
                              ...p,
                              authorName: e.target.value,
                            }))
                          }
                          className='w-full'
                        />
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <Input
                          type='text'
                          label='Publisher Name'
                          value={articleData.publisherName}
                          onChange={(e) =>
                            setArticleData((p) => ({
                              ...p,
                              publisherName: e.target.value,
                            }))
                          }
                          className='w-full'
                        />
                        <Input
                          type='text'
                          label='Publisher Logo URL'
                          value={articleData.publisherLogo}
                          onChange={(e) =>
                            setArticleData((p) => ({
                              ...p,
                              publisherLogo: e.target.value,
                            }))
                          }
                          className='w-full'
                        />
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <Input
                          type='datetime-local'
                          label='Date Published'
                          value={articleData.datePublished}
                          onChange={(e) =>
                            setArticleData((p) => ({
                              ...p,
                              datePublished: e.target.value,
                            }))
                          }
                          className='w-full'
                        />
                        <Input
                          type='datetime-local'
                          label='Date Modified'
                          value={articleData.dateModified}
                          onChange={(e) =>
                            setArticleData((p) => ({
                              ...p,
                              dateModified: e.target.value,
                            }))
                          }
                          className='w-full'
                        />
                      </div>
                    </>
                  )}

                  {schemaType === 'Organization' && (
                    <>
                      <Input
                        type='text'
                        label='Organization Name'
                        value={orgData.name}
                        onChange={(e) =>
                          setOrgData((p) => ({ ...p, name: e.target.value }))
                        }
                        className='w-full'
                      />
                      <Input
                        type='url'
                        label='Website URL'
                        value={orgData.url}
                        onChange={(e) =>
                          setOrgData((p) => ({ ...p, url: e.target.value }))
                        }
                        className='w-full'
                      />
                      <Input
                        type='url'
                        label='Logo URL'
                        value={orgData.logo}
                        onChange={(e) =>
                          setOrgData((p) => ({ ...p, logo: e.target.value }))
                        }
                        className='w-full'
                      />
                      <Textarea
                        label='Description'
                        value={orgData.description}
                        onChange={(e) =>
                          setOrgData((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        rows={3}
                      />
                    </>
                  )}

                  {schemaType === 'FAQPage' && (
                    <div className='space-y-6'>
                      {faqData.map((faq, index) => (
                        <div
                          key={index}
                          className='space-y-4 rounded-lg border border-gray-200 p-4 dark:border-slate-700'
                        >
                          <div className='flex items-center justify-between'>
                            <Text weight='semibold'>Question {index + 1}</Text>
                            {faqData.length > 1 && (
                              <button
                                type='button'
                                onClick={() =>
                                  setFaqData((p) =>
                                    p.filter((_, i) => i !== index),
                                  )
                                }
                                className='text-sm text-red-500 hover:text-red-600'
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <Input
                            type='text'
                            label='Question'
                            value={faq.question}
                            onChange={(e) => {
                              const newData = [...faqData]
                              newData[index].question = e.target.value
                              setFaqData(newData)
                            }}
                            className='w-full'
                          />
                          <Textarea
                            label='Answer'
                            value={faq.answer}
                            onChange={(e) => {
                              const newData = [...faqData]
                              newData[index].answer = e.target.value
                              setFaqData(newData)
                            }}
                            rows={2}
                          />
                        </div>
                      ))}
                      <Button
                        type='button'
                        secondary
                        onClick={() =>
                          setFaqData((p) => [
                            ...p,
                            { question: '', answer: '' },
                          ])
                        }
                        className='w-full text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700'
                      >
                        Add Question
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Code Output Section */}
              <div className='flex h-[600px] flex-col rounded-xl bg-slate-900 p-6 ring-1 ring-slate-800'>
                <div className='mb-4 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <CodeIcon className='h-5 w-5 text-gray-400' />
                    <h3 className='text-lg font-medium text-white'>
                      Generated JSON-LD
                    </h3>
                  </div>
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
                </div>

                <div className='flex-1 overflow-auto rounded-lg'>
                  <CodeBlock code={generatedCode} />
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-800'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                About Schema Markup
              </Text>
              <Text
                as='p'
                size='lg'
                colour='secondary'
                className='mt-4 leading-relaxed'
              >
                Schema markup is code that you put on your website to help the
                search engines return more informative results for users.
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
