import { RootProvider } from 'fumadocs-ui/provider/next';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { GithubInfo } from 'fumadocs-ui/components/github-info';
import type { ReactNode } from 'react';
import { source } from '@/lib/source';
import Script from 'next/script';
import Footer from './components/Footer';
import './global.css';

export const metadata = {
  title: {
    template: '%s | Swetrix Docs',
    default: 'Swetrix Docs',
  },
  description: 'Swetrix documentation — turn traffic into insights.',
  icons: { icon: '/docs/img/favicon.ico' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://swetrix.org/swetrix.js"
          strategy="afterInteractive"
        />
        <Script id="swetrix-init" strategy="afterInteractive">
          {`
            document.addEventListener('DOMContentLoaded', function () {
              swetrix.init('gdXQqPERkpMA', { devMode: false });
              swetrix.trackViews();
            });
          `}
        </Script>
      </head>
      <body>
        <RootProvider>
          <DocsLayout
            tree={source.getPageTree()}
            nav={{
              title: (
                <>
                  <img
                    src="/docs/img/logo_blue.png"
                    alt="Swetrix"
                    className="h-7 dark:hidden"
                  />
                  <img
                    src="/docs/img/logo_white.png"
                    alt="Swetrix"
                    className="hidden h-7 dark:block"
                  />
                </>
              ),
              url: 'https://swetrix.com',
            }}
            links={[
              {
                type: 'custom',
                children: (
                  <GithubInfo
                    owner="Swetrix"
                    repo="swetrix"
                    className="lg:-mx-2"
                  />
                ),
              },
            ]}
          >
            {children}
          </DocsLayout>
          <Footer />
        </RootProvider>
      </body>
    </html>
  );
}
