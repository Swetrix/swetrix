# Page titles

Apply the schema change before deploying the API and dashboard that use titles. From `backend`, with the target ClickHouse environment configured:

- Cloud: `node migrations/clickhouse/2026_09_26_page_titles.js`
- Community: `node migrations/clickhouse/selfhosted_2026_09_26_page_titles.js`

The shared database initialiser also creates and upgrades the `events.title` column, including Community startup via `npm run clickhouse:initialise`. Both standalone migrations are safe to rerun.

Deploy the updated browser tracker to start collecting titles. Existing pageviews remain untitled; no historical titles are inferred. Server-side callers can supply `title` through the Events API or `TrackPageViewOptions` in the Node tracker.
