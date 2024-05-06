---
title: Tracking script reference
slug: /swetrix-js-reference
---

import useBaseUrl from '@docusaurus/useBaseUrl';

The Swetrix.js is a highly customisable tracking script. The following is a reference of all the available functions and options it provides.

## init()
This fuction is used to initialise the analytics.
Basically you're letting the script know which project do you want to use it with, as well as specifying your custom parameters if needed.

It takes two arguments:
1. `projectID` - the ID of the project you want to use it with.
2. `options` - an object with custom options.

Here's an example of how to use this function with all the available options:

```javascript
swetrix.init('YOUR_PROJECT_ID', {
  devMode: false,
  disabled: false,
  respectDNT: false,
  apiURL: 'https://api.swetrix.com/log',
})
```

| Name | Description | Default value |
| --- | --- | --- |
| devMode | When set to `true`, localhost events will be sent to server. | `false` |
| disabled | When set to true, the tracking library won't send any data to server.<br />Useful for development purposes when this value is set based on '.env' var. | `false` |
| respectDNT | By setting this flag to true, we will not collect ANY kind of data about the user with the DNT setting. <br />This setting is not true by default because our service anonymises all incoming data and does not pass it on to any third parties under any circumstances. | `false` |
| apiURL | Set a custom URL of the API server (for selfhosted variants of Swetrix). | `'https://api.swetrix.com/log'` |

## track()
:::caution
It is important to ensure that no [Personal Data](https://en.wikipedia.org/wiki/Personal_data) that could identify a specific individual is transmitted in a metadata or custom event name field. Personally identifiable information (PII) is any information that can uniquely identify an individual, including full name, email address, phone number, credit card number, etc.
All other information is anonymised.
:::

With this function you can track any custom events you want.
You should never send any identifiable data (like User ID, email, session cookie, etc.) as an event name.
The total number of track calls and their conversion rate will be saved.

Here's an example of how to use this function with all the available options:
```javascript
swetrix.track({
  ev: 'YOUR_EVENT_NAME',
  unique: false,
})
```

| Name | Description | Default value |
| --- | --- | --- |
| ev | The event identifier you want to track.<br />This has to be a string, which:<br />1. Contains only English letters (a-Z A-Z), numbers (0-9), underscores (_) and dots (.).<br />2. Is fewer than 64 characters.<br />3. Starts with an English letter. | REQUIRED PARAMETER |
| unique | If true, only 1 event with the same ID will be saved per user session.<br />The principle of this parameter is similar to page views and unique views. | `false` |
| meta | An object that contains event-related metadata. The values of the object must be strings, the maximum number of keys allowed is `20` and the total length of the values combined must be less than `1000` characters.<br /> This feature is useful if you want to track additional data about your custom events, for example the custom event name might be `Sign up` and the metadata might be `{ affiliate: 'Yes', footer: 'No' }`. | `{}` |

## trackViews()
Calling trackViews will result in sending the data about the user to our servers.
Such data will include the following params if available:
1. `pid` - the unique Project ID request is related to.
2. `lc` - users locale (e.g. en_US or uk_UA).
3. `tz` - users timezone (e.g. Europe/Helsinki).
4. `ref` - the URL of the previous webpage from which a page was opened.
5. `so` - the page source ('ref' | 'source' | 'utm_source' GET param).
6. `me` - UTM medium ('utm_medium' GET param).
7. `ca` - UTM campaign ('utm_campaign' GET param).
8. `pg` - the page user currently views (e.g. /hello).
9. `perf` - an object which contains performance metrics related to the page load.

On the server side we also gather users IP Address and User Agent. This data is used to detect whether the page view is unique or not.

**We DO NOT store neither IP Address nor User Agent as a raw strings**, such data is stored as a salted hash for no longer than 30 minutes or 12:00 AM UTC, whatever happens first.

After this timeframe the identifiable data is forever deleted from our servers.

Here's an example of how to use this function with all the available options:
```javascript
swetrix.trackViews({
  unique: false,
  heartbeatOnBackground: false,
  hash: false,
  search: false,
  callback: undefined,
})
```

| Name | Description | Default value |
| --- | --- | --- |
| unique | If true, only unique events will be saved. This param is useful when tracking single-page landing websites. | `false` |
| ignore | A list of regular expressions or string pathes to ignore.<br />For example: `['/dashboard', /^/projects/i]` setting will force script to ignore all pathes which start with `/projects` or equal to `/dashboard`.<br />Please pay attention, that the pathes always start with `/`. | `[]` |
| callback | A callback used to edit / prevent sending pageviews.<br />It accepts an object with pageview event data as a parameter which has the following structure: <br />lc: string \| undefined<br />tz: string \| undefined<br />ref: string \| undefined<br />so: string \| undefined<br />me: string \| undefined<br />ca: string \| undefined<br />pg: string \| null \| undefined<br />prev: string \| null \| undefined<br /><br />The callback is supposed to return the edited payload or `false` to prevent sending the pageview. If `true` is returned, the payload will be sent as-is. | `undefined` |
| heartbeatOnBackground | Send Heartbeat requests when the website tab is not active in the browser.<br />Setting this to `true` means that users who opened your website in inactive browser tab or window will not be counted into users realtime statistics.<br />Setting this to true is usually useful for services like Spotify or Youtube. | `false` |
| hash | Set to `true` to enable hash-based routing. For example if you have pages like `/#/path` or want to track pages like `/path#hash`. | `false` |
| search | Set to `true` to enable search-based routing. For example if you have pages like `/path?search`. Although it's not recommended in most cases, you can set both `hash` and `search` to `true` at the same time, in which case the pageview event will be fired when either the hash or the search part of the URL changes (again, both the hash and the search are sent to the server). | `false` |

The `trackViews` function returns a `Promise` with an object with some methods allowing you to alter the behaviour of page tracking:
```javascript
{
  // This function stops the tracking of pages.
  stop() {},
}
```

## trackPageview()
This function is used to manually track a page view event.
It's useful if your application uses esoteric routing which is not supported by Swetrix by default.

This function takes the following arguments:
1. `path` - the path of the page you want to track.
2. (optional) `prev` - the path of the previous page user visited.
3. (optional) `unique` - if set to `true`, only 1 event with the same ID will be saved per user session.

Here are some examples of how to use this function:
```javascript
// Track a page view with a path '/hello' and no previous page.
swetrix.trackPageview('/hello')

// Track a page view with a path '/hello' and previous page '/world'.
swetrix.trackPageview('/hello', '/world')
```

## trackErrors()
This function is used to enable automatic client-side error monitoring. It adds an `error` event listener on your site and when an error happens - send it to our APIs.

The data we collect includes the following params if available:
1. `pid` - the unique Project ID request is related to.
2. `lc` - users locale (e.g. en_US or uk_UA).
3. `tz` - users timezone (e.g. Europe/Helsinki).
4. `pg` - the page user currently views (e.g. /hello).
5. `name` - error name (e.g. ParseError)
6. `message` - error message (e.g. Malformed input)
7. `lineno` / `colno` - on what line and column in your code did the error occur
8. `filename` - in what file did the error occur

Here's an example of how to use this function with all the available options:
```javascript
swetrix.trackErrors({
  sampleRate: 1,
  callback: undefined,
})
```

| Name | Description | Default value |
| --- | --- | --- |
| sampleRate | A number that indicates how many errors should be sent to the server. Accepts values between 0 and 1. For example, if set to 0.5 - only ~50% of errors will be sent to Swetrix. For testing, we recommend setting this value to 1. For production, you should configure it depending on your needs as each error event counts towards your plan. | `1` |
| callback | A callback used to edit / prevent sending errors. It accepts an object which contains some information about the error (`name`, `message`, `lineno`, `colno`, `filename`), as well as some regular analytics info (`lc`, `tz`, `pg`).<br />The callback is supposed to return the edited payload or `false` to prevent sending the pageview. If `true` is returned, the payload will be sent as-is. | `undefined` |

The `trackErrors` function returns an object with some methods allowing you to alter the behaviour of page tracking:
```javascript
{
  // This function stops the tracking of errors.
  stop() {},
}
```

## trackError()
This function is used to manually track an error event.

This function takes the following arguments:
1. `name` - the error name (e.g. ParseError)
2. (optional) `message` - error message (e.g. Malformed input)
3. (optional) `lineno` - on what line in your code did the error occur (e.g. 1520)
4. (optional) `colno` - on what column in your code did the error occur (e.g. 26)
5. (optional) `filename` - in what file did the error occur (e.g. https://example.com/broken.js)

Here is an example of how to use this function:
```javascript
swetrix.trackError({
  name: 'ParseError',
  message: 'Malformed input',
  lineno: 1520,
  colno: 26,
  filename: 'https://example.com/broken.js',
})
```
