import { DownloadIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import type { MetaFunction } from 'react-router'
import { redirect } from 'react-router'
import type { SitemapFunction } from 'remix-sitemap'
import { ClientOnly } from 'remix-utils/client-only'

import { DitchGoogle } from '~/components/marketing/DitchGoogle'
import { ToolsNav, ToolsNavMobile } from '~/components/ToolsNav'
import { isSelfhosted } from '~/lib/constants'
import Button from '~/ui/Button'
import Input from '~/ui/Input'
import Textarea from '~/ui/Textarea'
import { FAQ } from '~/ui/FAQ'
import { Text } from '~/ui/Text'
import Tooltip from '~/ui/Tooltip'
import { getDescription, getPreviewImage, getTitle } from '~/utils/seo'

export const meta: MetaFunction = () => {
  return [
    ...getTitle('Free QR Code Generator - Swetrix'),
    ...getDescription(
      'Create high-quality, customizable QR codes instantly. Perfect for links, marketing materials, and offline-to-online campaigns.',
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
    question: 'Do these QR codes expire?',
    answer:
      'No! The QR codes generated here are static, meaning they embed the destination URL directly into the code itself. They will work forever as long as your destination URL remains active.',
  },
  {
    question: 'How do I track how many people scan my QR code?',
    answer:
      'To track scans, generate a link using our UTM Generator first, then paste that trackable link into this QR Code Generator. When people scan the code, your analytics tool (like Swetrix) will track the traffic as a campaign.',
  },
  {
    question: 'What is the best size for a QR code?',
    answer:
      'For print materials like business cards, a QR code should be at least 2x2 cm (0.8x0.8 inches). For posters or billboards, it needs to be much larger depending on the scanning distance.',
  },
  {
    question: 'Can I change the colors of my QR code?',
    answer:
      'Yes, you can customize the foreground and background colors. However, make sure to maintain high contrast between the code (darker) and the background (lighter) so smartphone cameras can read it easily.',
  },
]

export default function QRCodeGenerator() {
  const [value, setValue] = useState('https://swetrix.com')
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')

  const downloadSVG = () => {
    const svgElement = document.getElementById('qr-code-svg')
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'swetrix-qrcode.svg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-slate-950'>
      <main className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <ToolsNavMobile className='mb-6 lg:hidden' />

        <div className='lg:flex lg:items-start lg:gap-8'>
          <div className='min-w-0 lg:flex-1'>
            <Text as='h1' size='4xl' weight='bold' tracking='tight'>
              QR Code Generator
            </Text>
            <Text as='p' size='lg' colour='muted' className='mt-4'>
              Instantly create beautiful, high-resolution QR codes for your
              links and marketing materials.
            </Text>

            <div className='mt-12 grid gap-8 lg:grid-cols-2'>
              {/* Input Section */}
              <div className='rounded-lg bg-white p-8 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                <h2 className='mb-6 text-xl font-semibold text-gray-900 dark:text-white'>
                  Configuration
                </h2>

                <div className='space-y-6'>
                  <div>
                    <Textarea
                      label='Website URL or Text'
                      placeholder='https://example.com'
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Input
                        type='color'
                        label={
                          <>
                            Code Color
                            <Tooltip
                              className='ml-1'
                              text='The color of the QR code pattern'
                            />
                          </>
                        }
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className='h-10 w-full cursor-pointer p-1'
                      />
                    </div>
                    <div>
                      <Input
                        type='color'
                        label={
                          <>
                            Background
                            <Tooltip
                              className='ml-1'
                              text='The background color behind the QR code'
                            />
                          </>
                        }
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className='h-10 w-full cursor-pointer p-1'
                      />
                    </div>
                  </div>

                  <div className='rounded-md bg-blue-50 p-4 dark:bg-blue-900/20'>
                    <p className='text-sm text-blue-800 dark:text-blue-300'>
                      <strong>Pro tip:</strong> Pair this with our UTM Generator
                      tool to track how many people scan your QR codes in your
                      analytics dashboard!
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview & Download Section */}
              <div className='flex flex-col items-center rounded-lg bg-white p-8 ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-800'>
                <h3 className='mb-6 text-xl font-semibold text-gray-900 dark:text-white'>
                  Preview
                </h3>

                <div className='flex flex-col items-center justify-center space-y-8'>
                  <div className='rounded-xl bg-gray-50 p-6 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700'>
                    <div
                      className='bg-white p-4 shadow-sm'
                      style={{ backgroundColor: bgColor }}
                    >
                      <ClientOnly
                        fallback={<div style={{ width: 256, height: 256 }} />}
                      >
                        {() => (
                          <QRCode
                            id='qr-code-svg'
                            value={value || 'https://swetrix.com'}
                            size={256}
                            fgColor={fgColor}
                            bgColor={bgColor}
                            level='H'
                          />
                        )}
                      </ClientOnly>
                    </div>
                  </div>

                  <Button
                    onClick={downloadSVG}
                    primary
                    regular
                    disabled={!value}
                    className='w-full max-w-xs'
                  >
                    <DownloadIcon className='mr-2 h-5 w-5' />
                    Download SVG
                  </Button>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <section className='mt-20 border-t border-gray-200 pt-16 dark:border-slate-700'>
              <Text as='h2' size='3xl' weight='bold' tracking='tight'>
                Free Online QR Code Generator
              </Text>
              <Text
                as='p'
                size='lg'
                colour='muted'
                className='mt-4 leading-relaxed'
              >
                Bridge the gap between your physical marketing materials and
                your digital presence. Our free QR code generator lets you
                instantly create high-quality, static QR codes that never
                expire. Perfect for business cards, flyers, restaurant menus,
                and event banners.
              </Text>

              <div className='mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2'>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Creative Ways to Use QR Codes
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Contactless Menus & Catalogs
                        </Text>{' '}
                        - Allow customers to scan a code on their table to view
                        your offerings instantly on their phone.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          App Downloads
                        </Text>{' '}
                        - Direct users straight to the App Store or Google Play
                        store to download your application.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Event Registration
                        </Text>{' '}
                        - Add a code to physical invitations that links directly
                        to an RSVP or ticketing page.
                      </Text>
                    </li>
                  </ul>
                </div>
                <div>
                  <Text as='h3' size='xl' weight='semibold'>
                    Best Practices for QR Codes
                  </Text>
                  <ul className='mt-3 space-y-2'>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Maintain High Contrast
                        </Text>{' '}
                        - Always ensure the QR code is significantly darker than
                        the background color so smartphone cameras can easily
                        read it.
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Size Matters
                        </Text>{' '}
                        - Make sure the printed code is large enough to scan. A
                        general rule of thumb is a minimum size of 2x2 cm
                        (0.8x0.8 inches).
                      </Text>
                    </li>
                    <li>
                      <Text colour='muted'>
                        <Text as='span' weight='semibold' colour='inherit'>
                          Track Your Scans
                        </Text>{' '}
                        - Add UTM parameters to your destination URL before
                        generating the code so you can track scans in your
                        analytics platform.
                      </Text>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <div className='mt-16'>
              <h2 className='mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white'>
                Frequently Asked Questions
              </h2>

              <FAQ items={FAQ_ITEMS} withStructuredData />
            </div>

            <DitchGoogle />
          </div>

          <aside className='hidden lg:sticky lg:top-12 lg:block lg:w-64 lg:shrink-0 lg:self-start'>
            <ToolsNav />
          </aside>
        </div>
      </main>
    </div>
  )
}
