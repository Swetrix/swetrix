<a name="top"></a>

<p align="center">
  <a href="https://github.com/Swetrix/swetrix">
   <img src="https://swetrix.com/assets/readme-image.png?v=3" alt="Logo">
  </a>

  <h3 align="center">Swetrix</h3>

  <p align="center">
    Open source, cookieless web analytics.
    <br />
    <a href="https://swetrix.com"><strong>Learn more »</strong></a>
    <br />
    <br />
    <a href="https://swetrix.com">Website</a>
    ·
    <a href="https://docs.swetrix.com">Docs</a>
    ·
    <a href="https://github.com/Swetrix/swetrix/issues">Issues</a>
    ·
    <a href="https://swetrix.com/discord">Discord</a>
    ·
    <a href="https://x.com/swetrix">Twitter</a>
    ·
    <a href="https://x.com/andrii_rom">Author</a>
  </p>
</p>

## ℹ️ About the Project

[Swetrix](https://swetrix.com) is an open source, privacy-focused and cookie-less alternative to Google Analytics. Swetrix is designed to be easy to use while providing all the features you need to understand your website users. With Swetrix you can track your site's traffic, monitor your site's speed, analyse user sessions and page flows, see user flows and much more!

Swetrix is made in the 🇬🇧 United Kingdom, and is hosted on Hetzner in 🇩🇪 Germany. Here's our [live demo with our own website statistics](https://swetrix.com/projects/STEzHcB1rALV).

We are a bootstrapped company that is passionate about privacy and open source, funded solely by our subscribers.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://swetrix.com/assets/screenshot_dark.png?v=1">
  <img alt="Swetrix Dashboard demonstration" src="https://swetrix.com/assets/screenshot_light.png?v=1">
</picture>

## ✨ Why Swetrix?

We've been building Swetrix since 2021 with a goal to make web analytics simple and respectful of your users' privacy.

- **Privacy‑first and cookieless**: GDPR‑compliant by design. We don't use cookies, cross-device tracking, all the data is stored anonymised. Read more in our [Data Policy](https://swetrix.com/data-policy) page.
- **Lightweight and fast**: a small tracking script and a snappy, real‑time dashboard.
- **Core insights that matter**: top pages, geolocation, map visualisation, devices, traffic sources and UTM campaigns.
- **Custom events and properties**: track conversions, sales, or key user actions with your own semantics.
- **Session analytics and user flows**: understand journeys and behaviour across your site.
- **Funnels**: visualise drop‑offs and improve conversion rates.
- **Performance monitoring**: real‑user metrics (e.g. TTFB, DNS, TLS, render) to keep sites fast.
- **Error tracking**: capture client‑side errors with details and aggregated views.
- **Shareable analytics**: public or password‑protected dashboards; invite teammates with roles, or manage access with organisations.
- **Data portability**: export to CSV and access data via our [developer API](https://docs.swetrix.com/statistics-api).
- **Alerts & notifications (Cloud)**: get notified on thresholds via Email, Slack, Telegram, Discord, generic outbound webhook or browser web push, with per-alert custom message templates.
- **Feature flags**: manage feature rollouts and conduct safe releases.
- **Experiments (Cloud)**: run A/B tests and experiments to optimize your site.
- **Revenue analytics (Cloud)**: track MRR, churn and other financial metrics.
- **Ask AI (Cloud)**: chat with your data to uncover insights.
- **Goals**: track specific conversion goals and objectives.
- **DAU/MAU tracking**: keep an eye on your daily and monthly active users.
- Open source and self‑hostable, with a fully managed EU‑hosted Cloud option.

## 🚀 Getting Started

The easiest way to get started with Swetrix is by using [our cloud service](https://swetrix.com). We do all the work for you: hosting, maintenance, backups, worldwide CDN, etc. Using Cloud you still own the data, you can export it or delete it at any time you want. It's GDPR‑compliant, hosted in the EU (Germany), with a free trial available.

We're an independent and bootstrapped company, your subscription to Swetrix Cloud directly supports maintenance and development of the project, which eventually makes it better.

- Start using Cloud: https://swetrix.com (starts at $19/mo with a free trial available)
- Explore docs: https://docs.swetrix.com

### Selfhosting

Prefer to run it yourself? Swetrix Community Edition (CE) ships the same core analytics: privacy‑friendly traffic stats, custom events, sessions, funnels, performance and error tracking. Use Docker to deploy the API and UI, connect MySQL/ClickHouse/Redis, and you're ready to go.

- Self‑hosting guide: https://docs.swetrix.com/selfhosting/how-to

Cloud vs Community Edition

|                                                                              | Swetrix Cloud                                                                                                                                                                     | Swetrix Community Edition                                                                                                                                       |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Infrastructure management**                                                | ✅ It's easy to get started with Swetrix Cloud - you can set up tracking in a matter of minutes. We manage server maintenance, upgrades, security for you.                        | ⚠️ You are responsible for managing servers, installs, upgrades, scaling and backups.                                                                           |
| **Core analytics (traffic, events, sessions, funnels, performance, errors)** | ✅ Included                                                                                                                                                                       | ✅ Included                                                                                                                                                     |
| **Advanced features (Revenue, Experiments, AI)**                             | ✅ Included                                                                                                                                                                       | ⚠️ Not included                                                                                                                                                 |
| **Teams & sharing**                                                          | ✅ Organisations to manage multiple projects and users with permissions setup; invite people to your projects directly, or share a public or password protected link with people. | ⚠️ Only direct project invites, password protected links and public projects are supported.                                                                     |
| **Alerts & notifications**                                                   | ✅ Yes (Email, Slack, Telegram, Discord, webhook, web push)                                                                                                                       | ⚠️ Not included                                                                                                                                                 |
| **Email reports**                                                            | ✅ Yes (weekly/monthly/quarterly)                                                                                                                                                 | ⚠️ Not included                                                                                                                                                 |
| **Geo analytics**                                                            | ✅ Swetrix Cloud uses premium GeoIP database to provide consistent and accurate country and city level geolocation data.                                                          | ⚠️ Less accurate, DB-IP City Lite Database; you need to pay for the full database if you want better accuracy.                                                  |
| **Release schedule**                                                         | ✅ Continuously developed with updates deployed as soon as they are ready                                                                                                         | ℹ️ Periodic open‑source releases, latest features are not available immediately.                                                                                |
| **Support**                                                                  | ✅ Premium support from the people who build and maintain Swetrix                                                                                                                 | ⚠️ Official support is not included. Community‑driven support on Discord or other forums only.                                                                  |
| **Costs**                                                                    | ✅ We're an independent and bootstrapped business, your money directly supports Swetrix development.                                                                              | ⚠️ You pay for the server costs and maintenance, backups, domains and other selfhosting costs, with money going to 3rd party services with no connection to us. |

## Tech Stack

Backend / API is built as a standard Nest.js application. We use MySQL with TypeORM for general data (accounts, projects, etc.), and Clickhouse for analytics data. Redis is used for caching.

Frontend is built using React Router framework. We use Tailwind CSS for styling and billboard.js for charts.

The [browser tracking script](https://github.com/Swetrix/swetrix-js) is built with TypeScript and rollup for bundling.

## 🤝 Contributing

See our [contributing guide](./CONTRIBUTING.MD) to get started. We welcome any contribution to the project!

Feel free to go through our [open issues](https://github.com/Swetrix/swetrix/issues) and pick any task you want to work on.

### Translations

We welcome translation contributions.

- We manage translations on our [Crowdin](https://crowdin.com/project/swetrix) page.
- If you'd like to help regularly or add a new language, open an issue and we'll guide you through our translation workflow.

## ⭐️ Star History

Star us on GitHub — your support motivates us a lot! 😊

<a href="https://www.star-history.com/#swetrix/swetrix&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=swetrix/swetrix&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=swetrix/swetrix&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=swetrix/swetrix&type=date&legend=top-left" />
 </picture>
</a>

## 💬 Contacts

To talk to our sales team for any commercial inquiries, ask us a question or just say hi 👋, you can contact us via:

- **Email:** contact@swetrix.com
- **Book a call:** we're happy to do a demo or sales call with you, you can book it at https://cal.com/swetrix
- **Discord:** join our [Discord community](https://swetrix.com/discord)
- **Twitter:** follow us on [Twitter](https://x.com/swetrix)
- **Author:** you can follow me (Andrii) on X too ☺️. I post about Swetrix and solopreneurship journey on [@andrii_rom](https://x.com/andrii_rom)

## 📃 License

Swetrix Community Edition is open source under the GNU Affero General Public License Version 3 (AGPLv3). The license can be found in the [LICENSE](./LICENSE) file.

Source code contributions are subject to the [Contributor License Agreement](https://gist.github.com/Blaumaus/cb232e7c2506b9feec188194a77cb9f9).

© 2021 - present, Swetrix Ltd.

[Back to top](#top)
