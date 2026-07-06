<a name="top"></a>

<p align="center">
  <a href="https://github.com/Swetrix/swetrix">
   <img src="https://swetrix.com/assets/readme-image.png?v=3" alt="Swetrix">
  </a>

  <h3 align="center">Swetrix</h3>

  <p align="center">
    Privacy-first, open-source web analytics — with error tracking, session replays and performance monitoring built in.
    <br />
    <a href="https://swetrix.com/demo"><strong>See the live demo »</strong></a>
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
  </p>
</p>

<p align="center">
  <a href="https://swetrix.com"><img src="https://img.shields.io/badge/Try%20Swetrix%20Cloud-free%20trial-1d4ed8" alt="Try Swetrix Cloud"></a>
  <a href="https://docs.swetrix.com/selfhosting/how-to"><img src="https://img.shields.io/badge/Self--host-with%20Docker-555" alt="Self-host with Docker"></a>
  <a href="https://github.com/Swetrix/swetrix/stargazers"><img src="https://img.shields.io/github/stars/Swetrix/swetrix?style=flat&label=Stars" alt="GitHub stars"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPLv3-green" alt="License"></a>
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://swetrix.com/assets/screenshot_dark.png?v=1">
  <img alt="Swetrix dashboard" src="https://swetrix.com/assets/screenshot_light.png?v=1">
</picture>

## ℹ️ What is Swetrix?

[Swetrix](https://swetrix.com) is a cookieless, GDPR-compliant analytics platform — a privacy-respecting alternative to Google Analytics. No cookies, no consent banner, no cross-device tracking, all data anonymised. It's the only thing on the page and the dashboard is fast and real-time.

It goes beyond pageviews: alongside traffic stats you get **error tracking**, **performance monitoring**, **session replays**, **funnels** and **custom events** — so you can replace several tools with one.

Open source since 2021, bootstrapped, and funded entirely by our subscribers. Made in the 🇬🇧 UK, hosted on Hetzner in 🇩🇪 Germany.

👉 **[Try it free on Swetrix Cloud](https://swetrix.com)** or **[self-host with Docker](https://docs.swetrix.com/selfhosting/how-to)**.

## ✨ Features

- **Cookieless & privacy-first** — GDPR-compliant by design, no cookies, anonymised data. ([Data Policy](https://swetrix.com/data-policy))
- **Lightweight script** — a small tracking snippet and a snappy real-time dashboard.
- **The metrics that matter** — top pages, geolocation with map view, devices, traffic sources and UTM campaigns.
- **Network intelligence** *(Cloud)* — break traffic down by ISP, organisation, usage type (residential / business / hosting / cellular) and connection type to spot bot and datacenter traffic.
- **Custom events & properties** — track conversions, sales or any key action with your own semantics.
- **Sessions & user flows** — understand journeys and behaviour across your site.
- **Funnels** — visualise drop-offs and improve conversion rates.
- **Performance monitoring** — real-user metrics (TTFB, DNS, TLS, render) to keep pages fast.
- **Error tracking** — capture client-side errors with details and aggregated views.
- **Session replays** *(Cloud)* — replay sessions to see exactly where visitors get stuck.
- **Sharing & teams** — public or password-protected dashboards; invite teammates with roles, or manage access with organisations.
- **Data portability** — export to CSV and access everything via the [developer API](https://docs.swetrix.com/statistics-api).
- **More** — alerts & notifications, feature flags, A/B experiments, revenue analytics and Ask AI *(Cloud)*.

## Swetrix vs Google Analytics vs Plausible

Swetrix and Plausible are both privacy-first and open source; the main difference is scope — Swetrix bundles error tracking, performance monitoring and session replays into the same product.

|                                  | **Swetrix**            | Google Analytics 4      | Plausible            |
| -------------------------------- | ---------------------- | ----------------------- | -------------------- |
| Cookieless, no consent banner    | ✅                     | ❌ cookies + consent    | ✅                   |
| GDPR-compliant, EU-hosted        | ✅                     | ⚠️ data sent to US      | ✅                   |
| Open source (AGPLv3)             | ✅                     | ❌                      | ✅                   |
| Self-hostable                    | ✅                     | ❌                      | ✅                   |
| No data sampling                 | ✅                     | ❌ samples at scale     | ✅                   |
| Real-time dashboard              | ✅                     | ⚠️ limited              | ✅                   |
| Funnels                          | ✅                     | ✅                      | ✅ (paid plans)      |
| Custom events                    | ✅                     | ✅                      | ✅                   |
| Performance monitoring           | ✅                     | ❌                      | ❌                   |
| Error tracking                   | ✅                     | ❌                      | ❌                   |
| User profiles / identified users | ✅                     | ❌                      | ❌                   |
| Feature flags & A/B experiments  | ✅                     | ❌                      | ❌                   |
| Session replays                  | ✅ Cloud               | ❌                      | ❌                   |
| Revenue / MRR analytics          | ✅ Cloud               | ⚠️ ecommerce setup      | ❌                   |
| Ask AI / chat with your data     | ✅ Cloud               | ❌                      | ❌                   |

## 🚀 Get started

### Swetrix Cloud (recommended)

We handle hosting, maintenance, backups and a worldwide CDN — you keep full ownership of your data and can export or delete it anytime. GDPR-compliant and hosted in the EU.

- **[Start free →](https://swetrix.com)** — free trial, then from $19/mo
- **[Live demo →](https://swetrix.com/demo)**
- **[Docs →](https://docs.swetrix.com)**

Your subscription directly funds maintenance and development of the open-source project.

### Self-hosting

Prefer to run it yourself? Swetrix Community Edition (CE) ships the same core analytics: privacy-friendly traffic stats, custom events, sessions, funnels, performance and error tracking. Deploy the API and UI with Docker, connect MySQL / ClickHouse / Redis, and you're live.

- **[Self-hosting guide →](https://docs.swetrix.com/selfhosting/how-to)**

#### Cloud vs Community Edition

|                                                                              | Swetrix Cloud                                                                                                                                                                     | Swetrix Community Edition                                                                                                                                       |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Infrastructure management**                                                | ✅ Set up tracking in minutes. We manage server maintenance, upgrades and security for you.                                                                                       | ⚠️ You manage servers, installs, upgrades, scaling and backups.                                                                                                |
| **Core analytics (traffic, events, sessions, funnels, performance, errors)** | ✅ Included                                                                                                                                                                       | ✅ Included                                                                                                                                                     |
| **Session replays**                                                          | ✅ Included                                                                                                                                                                       | ⚠️ Cloud only                                                                                                                                                   |
| **Advanced features (Revenue, Experiments, AI)**                             | ✅ Included                                                                                                                                                                       | ⚠️ Cloud only                                                                                                                                                   |
| **Teams & sharing**                                                          | ✅ Organisations, role-based access, direct invites, public and password-protected links.                                                                                        | ⚠️ Direct project invites, password-protected links and public projects only.                                                                                  |
| **Alerts & notifications**                                                   | ✅ Email, Slack, Telegram, Discord, webhook, web push                                                                                                                             | ⚠️ Not included                                                                                                                                                 |
| **Email reports**                                                            | ✅ Weekly / monthly / quarterly                                                                                                                                                   | ⚠️ Not included                                                                                                                                                 |
| **Geo & network analytics**                                                  | ✅ Premium GeoIP for accurate country / region / city, plus ISP, organisation, usage type and connection type.                                                                    | ⚠️ DB-IP City Lite (country / region / city only); a paid MaxMind or DB-IP database is needed for network breakdowns.                                            |
| **Release schedule**                                                         | ✅ Continuous updates, deployed as soon as ready                                                                                                                                  | ℹ️ Periodic open-source releases; newest features arrive later.                                                                                                 |
| **Support**                                                                  | ✅ Premium support from the team building Swetrix                                                                                                                                 | ⚠️ Community support on Discord and forums.                                                                                                                      |
| **Costs**                                                                    | ✅ Bootstrapped business — your money directly funds Swetrix development.                                                                                                          | ⚠️ You pay for servers, maintenance, backups and domains.                                                                                                       |

## 🛠️ Tech stack

- **Backend / API** — Nest.js, MySQL + TypeORM (accounts, projects), ClickHouse (analytics), Redis (caching).
- **Frontend** — React Router, Tailwind CSS, billboard.js for charts.
- **Tracking script** — [`packages/tracker-js`](./packages/tracker-js), the `swetrix` npm client, TypeScript bundled with rollup.

## 🤝 Contributing

We welcome contributions! See the [contributing guide](./CONTRIBUTING.MD) and browse [open issues](https://github.com/Swetrix/swetrix/issues) to pick something up.

## ⭐️ Star History

If Swetrix is useful to you, **star the repo** — it genuinely helps a bootstrapped team and motivates us a lot 😊

<a href="https://www.star-history.com/#swetrix/swetrix&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=swetrix/swetrix&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=swetrix/swetrix&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=swetrix/swetrix&type=date&legend=top-left" />
 </picture>
</a>

## 💬 Contact

- **Email:** contact@swetrix.com
- **Book a call:** [swetrix.com/book-a-call](https://swetrix.com/book-a-call)
- **Discord:** [join the community](https://swetrix.com/discord)
- **Twitter:** [@swetrix](https://x.com/swetrix)
- **Author:** I post about Swetrix and solopreneurship at [@andrii_rom](https://x.com/andrii_rom)

## 📃 License

Swetrix Community Edition is open source under the GNU Affero General Public License v3 (AGPLv3). See the [LICENSE](./LICENSE) file. Source code contributions are subject to the [Contributor License Agreement](https://gist.github.com/Blaumaus/cb232e7c2506b9feec188194a77cb9f9).

© 2021 - present, Swetrix Ltd.

[Back to top](#top)
