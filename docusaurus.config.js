// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: 'Swetrix Docs',
  tagline:
    'For the first privacy-preserving protocol built for scalability, privacy and interoperability.',
  url: 'https://docs.swetrix.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  favicon: 'img/logo192.png',
  organizationName: 'swetrix', // github org name.
  projectName: 'docs', // repo name.
  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      logo: {
        alt: 'Swetrix Logo',
        src: 'img/logo_blue.svg',
        srcDark: 'img/logo_white.svg',
        width: '130px',
        height: '50px',
      },
      items: [
        {
          href: 'https://swetrix.com',
          label: 'Swetrix',
          position: 'left',
        },
        {
          href: 'https://github.com/swetrix',
          label: 'GitHub',
          position: 'left',
        },
        {
          type: "localeDropdown",
          position: "left"
        }
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Twitter',
              href: 'https://twitter.com/swetrix',
            },
            {
              label: 'Discord',
              href: 'https://discord.gg/',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/swetrix',
            },
            {
              label: 'Email',
              href: 'mailto:contact@swetrix.com',
            },
          ],
        },
      ],
      copyright: `Copyright © 2019-${new Date().getFullYear()} Swetrix. Built with Docusaurus.`,
    },
    prism: {
      theme: lightCodeTheme,
      darkTheme: darkCodeTheme,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/swetrix/docs/',
        },
        theme: {
          customCss: [require.resolve('./src/css/custom.css')],
        },
      },
    ],
  ],
  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.13.11/dist/katex.min.css',
      integrity:
        'sha384-Um5gpz1odJg5Z4HAmzPtgZKdTBHZdw8S29IecapCSB31ligYPhHQZMIlWLYQGVoc',
      crossorigin: 'anonymous',
    },
  ],
  plugins: [
    async function myPlugin(context, options) {
      return {
        name: "docusaurus-tailwindcss",
        configurePostCss(postcssOptions) {
          postcssOptions.plugins.push(require("tailwindcss"));
          postcssOptions.plugins.push(require("autoprefixer"));
          return postcssOptions;
        },
      };
    },
    // [
    //   require.resolve('@cmfcmf/docusaurus-search-local'),
    //   {
    //     indexDocs: true,
    //     indexPages: false,
    //     language: ["en", "zh", "ru"],
    //     maxSearchResults: 10,
    //   },
    // ],
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'cn', 'ru'],
    localeConfigs: {
      en: {
        label: 'English',
      },
      cn: {
        label: '中文',
      },
      ru: {
        label: 'Русский',
      },
    }
  },
};

