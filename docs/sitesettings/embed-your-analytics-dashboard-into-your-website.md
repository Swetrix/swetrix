---
title: Embed your analytics dashboard into your website
slug: /how-to-embed
---

import useBaseUrl from '@docusaurus/useBaseUrl';

You can embed your Swetrix analytics dashboard into any other website using an iframe. This is useful if you're building a custom admin panel, a dashboard for your customers or just want to show your stats to your visitors.

### 1. Get your sharable link
First, you need to find the sharable link to your dashboard. You can get it in your [site settings](/how-to-access-site-settings) page. For people to be able to access your dashboard, you need to make it public or password-protected.

### 2. Write the HTML embed code
Now you need to write the HTML code for the iframe. You can do this in any text editor, or directly in your website's code. Here's an example of how it should look like:

```html
<iframe src="https://swetrix.com/projects/YOUR_PROJECT_ID?tab=traffic&theme=dark" width="1200" height="700" title="Test"></iframe>
```

### 3. Paste the code into your website
Now you can paste the code into your website's HTML. You can put it anywhere you want, but it's usually best to put it in a dedicated page or section.

### Embed options and customisation
You can customise the embed code to fit your needs. For example, you can change the width and height of the iframe or change the theme to match your website's design.
Here is a list of all available options:

 - `theme`: `light` or `dark` - the theme of the dashboard.
 - `tab`: `traffic`, `performance`, `sessions`, `errors`, `funnels`, `alerts` - the default tab to show. By default, the traffic tab is shown.
 - `tabs`: `traffic`, `performance`, `sessions`, `errors`, `funnels`, `alerts` - a comma-separated list of tabs that should be accessible in dashboard. Example: `tabs=traffic,performance,sessions` will only show the traffic, performance and sessions tabs. By default, all tabs are shown.
 - `embedded` - if set to `true`, header, footer and any marketing CTAs will be hidden.
 - `password` - if your dashboard is password-protected, you can pass the password as a query parameter. Example: `password=yourpassword`, this way the dashboard will be unlocked without the need to enter the password.