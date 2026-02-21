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
              swetrix.init('gdXQqPERkpMA');
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
                <div className="flex -translate-y-[2px] items-center gap-2 select-none">
                  <img
                    className="-translate-y-px dark:hidden"
                    height="28"
                    width="24"
                    src="/docs/img/logo/blue.png"
                    alt=""
                  />
                  <img
                    className="-translate-y-px hidden dark:block"
                    height="28"
                    width="24"
                    src="/docs/img/logo/white.png"
                    alt=""
                  />
                  <span className="text-2xl leading-5 font-bold text-slate-900 dark:text-white">
                    Swetrix
                  </span>
                </div>
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
