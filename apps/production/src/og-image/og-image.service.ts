import { Injectable } from '@nestjs/common'
import handlebars from 'handlebars'
import puppeteer from 'puppeteer'

const WHITE_LOGO_BASE64 =
  'data:image/png;base64,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'

const previewHTML = `
<!DOCTYPE html>
<html lang='en'>
  <head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
    <style>{{styles}}</style>
  </head>
  <body id='body'>
    <main>
      <div class='gradient'>
        <div class='gradient__inner'></div>
      </div>
      <div>
        <div class='title'>{{title}}</div>
      </div>
      <div class='footer'>
        <div class='logo'>
          <img src='${WHITE_LOGO_BASE64}' alt='' />
        </div>
        <span class='separator'>
          |
        </span>
        <span class='swetrix_desc'>
          Privacy friendly web analytics
        </span>
      </div>
    </main>
  </body>
</html>
`

const previewStyles = `
* {
  box-sizing: border-box;
}
:root {
  font-size: 16px;
  font-family: Inter, Ubuntu, sans-serif;
}
body {
  padding: 2.5rem;
  background: linear-gradient(to right, #0f172a, #1c2649);
  height: 90vh;
  color: white;
}
main {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  isolation: isolate;
}
.gradient {
  position: absolute;
  filter: blur(64px);
  padding-left: 9rem;
  padding-right: 9rem;
  overflow: hidden;
  z-index: -10;
  left: 0;
  right: 0;
  top: -20px;
}
.gradient__inner {
  margin-left: auto;
  margin-right: auto;
  aspect-ratio: 1155/678;
  width: 72.1875rem;
  background-image: linear-gradient(to top right, #ff80b5, #9089fc);
  opacity: .3;
  clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%);
}
.footer {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 2rem;
  font-weight: 200;
}
.swetrix_desc {
  position: absolute;
  top: 7px;
  left: calc(205px + 2rem);
}
.logo {
  width: 200px;
  height: 44px;
}
.logo img {
  width: 100%;
  height: 100%;
}
.title {
  font-size: {{fontSize}};
  text-transform: capitalize;
  margin: 0.25rem 0;
  font-weight: bold;
}
`

// Get dynamic font size for title depending on its length
function getFontSize(title: string) {
  if (!title) return ''
  const titleLength = title.length
  if (titleLength > 55) return '2.75rem'
  if (titleLength > 35) return '3.25rem'
  if (titleLength > 25) return '4.25rem'
  return '4.75rem'
}

const getCompiledStyles = (name: string): string => {
  return handlebars.compile(previewStyles)({
    fontSize: getFontSize(name),
  })
}

const getCompiledHTML = (title: string, styles: string) => {
  return handlebars.compile(previewHTML)({
    title,
    styles,
  })
}

export const browserArgs = [
  '--autoplay-policy=user-gesture-required',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-domain-reliability',
  '--disable-extensions',
  '--disable-features=AudioServiceOutOfProcess',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-notifications',
  '--disable-offer-store-unmasked-wallet-cards',
  '--disable-popup-blocking',
  '--disable-print-preview',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-setuid-sandbox',
  '--disable-speech-api',
  '--disable-sync',
  '--hide-scrollbars',
  '--ignore-gpu-blacklist',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-sandbox',
  '--no-zygote',
  '--password-store=basic',
  '--use-gl=swiftshader',
  '--use-mock-keychain',
]

@Injectable()
export class OgImageService {
  // constructor() {}

  getOgHTML(title: string) {
    const styles = getCompiledStyles(title)
    const html = getCompiledHTML(title, styles)

    return html
  }

  async getOgImage(title: string) {
    const html = this.getOgHTML(title)

    const browser = await puppeteer.launch({
      headless: 'new',
      args: browserArgs,
      defaultViewport: {
        width: 1200,
        height: 630,
      },
    })
    const page = await browser.newPage()

    // Set the content to our rendered HTML
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    // Wait until all images and fonts have loaded
    await page.evaluate(async () => {
      const selectors = Array.from(document.querySelectorAll('img'))
      await Promise.all([
        document.fonts.ready,
        ...selectors.map(img => {
          // Image has already finished loading, let’s see if it worked
          if (img.complete) {
            // Image loaded and has presence
            if (img.naturalHeight !== 0) return
            // Image failed, so it has no height
            throw new Error('Image failed to load')
          }
          // Image hasn’t loaded yet, added an event listener to know when it does
          // eslint-disable-next-line consistent-return
          return new Promise((resolve, reject) => {
            img.addEventListener('load', resolve)
            img.addEventListener('error', reject)
          })
        }),
      ])
    })

    const element = await page.$('#body')
    const image = await element.screenshot({
      omitBackground: true,
      type: 'jpeg',
    })
    await browser.close()

    return image
  }
}
