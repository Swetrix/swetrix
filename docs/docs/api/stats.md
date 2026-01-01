---
title: Statistics API reference
slug: /statistics-api
---

Swetrix provides the ability to retrieve aggregated data not only through the UI, but also programmatically using API queries.

The statistics API provides several GET endpoints. These endpoints require some query parameters and return standard HTTP responses and a JSON-encoded body. API requests without a valid API key will fail (except for the publicly available API endpoints).

Each request must be authenticated with an API key using `X-Api-Key` HTTP header. You can obtain an API key in your Swetrix [account settings](https://swetrix.com/user-settings).

Rate limit for the API depends on your plan, you can find more information on the billing (or the main) page.
As of 9 February 2023, the rate limits are as follows:

- **Free plan**: 600 requests per hour;
- **Any paid plan**: 600 requests per hour.

If you have special needs for more requests, please contact us to request more capacity.

## Concepts

### Time buckets

- **minute** - 1 minute;
- **hour** - 1 hour;
- **day** - 1 day;
- **week** - 1 week;
- **month** - 1 month;
- **year** - 1 year.

### Periods

- **1h** - last 1 hour;
- **today** - today (i.e. the time starting from 12:00 AM of the current day);
- **yesterday** - yesterday (i.e. the time starting from 12:00 AM of the previous day);
- **1d** - last 24 hours;
- **7d** - last 7 days (i.e. `current_day - 7 days`);
- **4w** - last 4 weeks;
- **3M** - last 3 months;
- **12M** - last 12 months;
- **24M** - last 24 months.
- **all** - all time (i.e. the time starting from the project creation date).

:::info
`Time buckets` and `periods` are predefined values that you can use in your API requests. The API won't accept any other values. If you want to specify a custom time range, use `from` and `to` parameters in your aggregation requests.
:::

### Measures

Measures are an aggregate functions that are used for performance-related endpoints. They allow you to select a function that will be used for aggregation of your metrics.
It supports the following values:

1. `median` (default) - the middle value of a set of numbers (i.e. 50th percentile).
2. `average` - the arithmetic mean value.
3. `p95` - the 95th quantile.
4. `quantiles` - it's a special measure, because instead of the regular metrics (e.g. `dns`, `tls`, etc.) it will return load time (the sum on all metrics) across 3 quantiles: `p50`, `p75` and `p95`.

### Filters

Filters are used to aggregate data by specific parameters. For example, you can filter the data by country, browser, operating system, etc.

'Filter' is an object with the following structure:

```json
{
  "column": "cc",
  "filter": "GB",
  "isExclusive": false,
  "isContains": false
}
```

- **column** - the column to filter by. Possible values are: `cc` (country code), `host` (hostname), `pg` (page), `lc` (locale), `br` (browser), `brv` (browser version), `os` (operating system), `osv` (OS version), `dv` (device), `ref` (referrer), `so` (source), `me` (medium), `ca` (campaign).
- **filter** - the value to filter by. For example, if you want to filter by country, the value should be a country code (e.g. `GB` for Great Britain).
- **isExclusive** - whether to include or exclude the specified value. If `isExclusive` is `true`, the data will be filtered by the specified value. If `isExclusive` is `false`, the data will be filtered by all values except the specified one.
- **isContains** - whether the value should be matches exactly, or if it should be a substring. If `isContains` is `true`, the data will be filtered by the specified value (for example, searching for "rain" will return "Ukraine" because it contains "rain"). If `isContains` is `false`, the data will be filtered by the specified value exactly.

### Mode

The mode parameter specifies how the data is aggregated. Possible values are:

- **periodic** - data is aggregated by the specified time bucket (e.g. by day, week, etc.);
- **cumulative** - data is aggregated cumulatively (e.g. the number of visits for the current day is the sum of the number of visits for all previous days and the current day).

### Metrics

Metrics are a set of rules that allow you to aggregate your custom events as decimals or integers. They're extremely useful for e-commerce platforms, allowing you to calculate your sales, for example.
This parameter is only supported for [traffic analytics](#get-v1log) endpoint.

'Metric' is an object with the following structure:

```json
{
  "customEventName": "sale",
  "metaKey": "currency",
  "metaValue": "USD",
  "metricKey": "amount",
  "metaValueType": "float"
}
```

Where:

1. `customEventName` (required): is the name of the custom event you want to apply your metric to.
2. `metaKey` (optional): Custom event metadata key to filter (for example, "currency").
3. `metaValue` (optional): Custom event metadata value to filter (for example, "GBP").
4. `metricKey` (required): Metadata key to aggregate (for example, "amount").
5. `metaValueType` (required): Specifies how to interpret the custom metric value. For example, `float` will convert "15.99" to 15.99, while `integer` will interpret it as 15. (supported values are: `integer`, `float`. If set to `string`, the whole metric will be ignored.)

## Endpoints

### GET /v1/log

This endpoint returns the aggregated traffic data for your project. This is the exact same data you see in the Traffic tab of your Dashboard, but represented as a JSON entity.

```bash
curl 'https://api.swetrix.com/v1/log?pid=YOUR_PROJECT_ID&timeBucket=day&period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "params": {
    "cc": [
      {
        "name": "UA",
        "count": 3
      },
      {
        "name": "CZ",
        "count": 1
      }
    ],
    "rg": [
      {
        "name": "Kyiv Oblast'",
        "cc": "UA",
        "rgc": "30",
        "count": 3
      },
      {
        "name": "Prague",
        "cc": "CZ",
        "rgc": "10",
        "count": 1
      }
    ],
    "ct": [
      {
        "name": "Kyiv",
        "cc": "UA",
        "count": 3
      },
      {
        "name": "Prague",
        "cc": "CZ",
        "count": 1
      }
    ],
    "host": [
      {
        "name": "example.com",
        "count": 4
      }
    ],
    "pg": [
      {
        "name": "/",
        "count": 4
      }
    ],
    "lc": [
      {
        "name": "sk",
        "count": 1
      },
      {
        "name": "en-GB",
        "count": 3
      }
    ],
    "br": [
      {
        "name": "Chrome",
        "count": 20
      }
    ],
    "brv": [
      {
        "name": "129.0",
        "br": "Chrome",
        "count": 20
      }
    ],
    "os": [
      {
        "name": "Windows",
        "count": 32
      }
    ],
    "osv": [
      {
        "name": "10.0",
        "os": "Windows",
        "count": 32
      }
    ],
    "dv": [
      {
        "name": "desktop",
        "count": 33
      }
    ],
    "ref": [],
    "so": [],
    "me": [],
    "ca": [],
    "te": [],
    "co": []
  },
  "chart": {
    "x": [
      "2023-02-02 00:00:00",
      "2023-02-03 00:00:00",
      "2023-02-04 00:00:00",
      "2023-02-05 00:00:00",
      "2023-02-06 00:00:00",
      "2023-02-07 00:00:00",
      "2023-02-08 00:00:00",
      "2023-02-09 00:00:00"
    ],
    "visits": [0, 2, 9, 12, 4, 7, 4, 0],
    "uniques": [0, 2, 9, 10, 4, 7, 4, 0],
    "sdur": [0, 54, 2, 126, 8, 8, 2]
  },
  "customs": {
    "sale": 16,
    "signup": 10
  },
  "properties": {
    "author": 30
  },
  "appliedFilters": []
}
```

#### Parameters

<hr />

**pid** (required)

The project ID.

<hr />

**timeBucket** (required)

See [time buckets](#time-buckets).

<hr />

**period** (required)

See [periods](#periods).

<hr />

**from** / **to**

Instead of specifying a fixed period, you can specify a custom time range using `from` and `to` parameters. Both parameters are optional, but if you specify `from`, you must also specify `to`. The format is `YYYY-MM-DD`.

<hr />

**timezone**

The timezone to use for the time range. The default is `Etc/GMT`. You can use any timezone supported by [day.js](https://day.js.org/docs/en/timezone/timezone/) library.

<hr />

**filters**

An array of [filter objects](#filters).

<hr />

**mode**

[Mode](#mode) used to aggregate the data. The default is `periodic`.

<hr />

**metrics**

An optional array of [metric objects](#metrics), with up to 3 metrics allowed. If the `metrics` array is provided and it's valid, it will be calculated on the backend and an additional field called `meta` will be returned in the response.

The `filters` and `timezone` parameters provided within the same request are also used when calculating custom metrics.

The `meta` is an array of objects like:

```javascript
{
  "key": "amount", // equals to "metricKey" provided
  "current": { // for the current period or from / to pair
    "sum": 100, // the sum of all custom metrics
    "avg": 20, // the average of all custom metrics
  },
  "previous": { // for the previous period of the same length as the current one
    "sum": 80,
    "avg": 30,
  },
}
```

<hr />

### GET /v1/log/performance

This endpoint accepts the same parameters as the [`/log` endpoint](#get-v1log).
The response is almost the same as for the `/log` endpoint, but with additional performance metrics.

The `chart` object contains performance metrics represented as an array of values for each time bucket. The `x` array contains the time bucket labels, and the other arrays contain the values for each metric. The index of each value corresponds to the index of the time bucket label in the `x` array.

The metric values are in seconds.

The metrics are:

- `dns` - DNS Resolution time;
- `tls` - TLS Setup time;
- `conn` - Connection time;
- `response` - Response time;
- `render` - Browser render time;
- `domLoad` - DOM Content Load time;
- `ttfb` - Time to First Byte.

This endpoint also accepts [measures](#measures) parameter.

```bash
curl 'https://api.swetrix.com/v1/log/performance?pid=YOUR_PROJECT_ID&timeBucket=day&period=7d&measure=average'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "params": {
    "dv": [
      {
        "name": "desktop",
        "count": 0.08
      }
    ],
    "host": [
      {
        "name": "example.com",
        "count": 0.08
      }
    ],
    "pg": [
      {
        "name": "/",
        "count": 0.08
      }
    ],
    "ct": [],
    "cc": [
      {
        "name": "IS",
        "count": 0.1
      },
      {
        "name": "GB",
        "count": 0.06
      }
    ],
    "brv": [
      {
        "name": "129.0",
        "br": "Chrome",
        "count": 0.21
      },
      {
        "name": "132.0",
        "br": "Firefox",
        "count": 0.08
      }
    ],
    "br": [
      {
        "name": "Firefox",
        "count": 0.1
      },
      {
        "name": "Chrome",
        "count": 0.06
      }
    ],
    "rg": []
  },
  "chart": {
    "x": [
      "2023-02-02 00:00:00",
      "2023-02-03 00:00:00",
      "2023-02-04 00:00:00",
      "2023-02-05 00:00:00",
      "2023-02-06 00:00:00",
      "2023-02-07 00:00:00",
      "2023-02-08 00:00:00",
      "2023-02-09 00:00:00"
    ],
    "dns": [0, 0, 0.09, 0.05, 0.02, 0.05, 0.06, 0],
    "tls": [0, 0.13, 0.06, 0.06, 0.07, 0.33, 0.34, 0],
    "conn": [0, 0, 0.04, 0.03, 0.01, 0.02, 0.02, 0],
    "response": [0, 0.01, 0, 0, 0, 0.37, 0, 0],
    "render": [0, 0.01, 0.38, 0.17, 0.63, 0.07, 0.07, 0],
    "domLoad": [0, 0.91, 0.48, 0.54, 0.69, 0.94, 1.22, 0],
    "ttfb": [0, 0.06, 0.07, 0.07, 0.05, 0.1, 1.11, 0]
  },
  "appliedFilters": []
}
```

### GET /v1/log/birdseye

This endpoint returns a summary of the log data for the specified projects. The response is an object with project IDs as keys and objects with the following properties as values:

```typescript
{
  current: { // data for the selected period
    all: number // pageviews
    unique: number // unique visitors
    bounceRate: number // bounce rate
    sdur: number // average session duration
  },
  previous: { // data for the previous period
    all: number
    unique: number
    bounceRate: number
    sdur: number
  },
  change: number, // change in the number of pageviews
  uniqueChange: number, // change in the number of unique visitors
  bounceRateChange: number, // change in the bounce rate
  sdurChange: number, // change in the average session duration
}
```

```bash
curl 'https://api.swetrix.com/v1/log/birdseye?pids=["YOUR_PROJECT_ID"]&period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "YOUR_PROJECT_ID": {
    "current": {
      "all": 1633,
      "unique": 650,
      "sdur": 1722.293846153846,
      "bounceRate": 39.8
    },
    "previous": {
      "all": 1785,
      "unique": 653,
      "sdur": 1618.4303215926493,
      "bounceRate": 36.6
    },
    "change": -152,
    "uniqueChange": -3,
    "bounceRateChange": -3.1999999999999957,
    "sdurChange": 103.86352456119675
  }
}
```

#### Parameters

<hr />

**pids** (required)

An array of project IDs to return summary data for.

<hr />

**pid**

A single project ID to return summary data for. You can use either `pids` or `pid` parameter, but not both.

<hr />

**period** (required)

See [periods](#periods).

<hr />

**from** / **to**

Instead of specifying a fixed period, you can specify a custom time range using `from` and `to` parameters. Both parameters are optional, but if you specify `from`, you must also specify `to`. The format is `YYYY-MM-DD`.

<hr />

**timezone**

The timezone to use for the time range. The default is `Etc/GMT`. You can use any timezone supported by [day.js](https://day.js.org/docs/en/timezone/timezone/) library.

<hr />

**filters**

An array of [filter objects](#filters).

<hr />

### GET /v1/log/performance/birdseye

This endpoint returns a summary of the performance data for the specified projects. This endpoint also accepts [measures](#measures) parameter.
The response is an object with project IDs as keys and objects with the following properties as values:

```typescript
{
  current: { // data for the selected period
    frontend: number // a sum of such metrics as browser render time and DOM Content Load time
    backend: number // TTFB
    network: number // a sum of such metrics as DNS Resolution time, TLS Setup time, Connection time and Response time
  },
  previous: { // data for the previous period
    frontend: number
    backend: number
    network: number
  },
  frontendChange: number, // change in the number of frontend metrics
  networkChange: number, // change in the number of network metrics
  backendChange: number, // change in the number of backend metrics
}
```

```bash
curl 'https://api.swetrix.com/v1/log/performance/birdseye?pids=["YOUR_PROJECT_ID"]&period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "YOUR_PROJECT_ID": {
    "current": {
      "frontend": 1.3297172264355364,
      "network": 0.4225330444203684,
      "backend": 0.14972047670639219
    },
    "previous": {
      "frontend": 1.1174158607350095,
      "network": 0.1695841392649903,
      "backend": 0.11855705996131527
    },
    "frontendChange": 0.21230136570052663,
    "networkChange": 0.25294890515537805,
    "backendChange": 0.031163416745076916
  }
}
```

#### Parameters

Accepts the same parameters as the [`/log/birdseye` endpoint](#get-v1logbirdseye).

### GET /v1/log/captcha/birdseye

This endpoint returns a summary of the CAPTCHA data for the specified projects. The response is an object with project IDs as keys and objects with the following properties as values:

```typescript
{
  current: { // data for the selected period
    all: number // number of CAPTCHA completions
  },
  previous: { // data for the previous period
    all: number
  },
  change: number, // change in the number of CAPTCHA completions
}
```

```bash
curl 'https://api.swetrix.com/v1/log/captcha/birdseye?pids=["YOUR_PROJECT_ID"]&period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "YOUR_PROJECT_ID": {
    "current": {
      "all": 75
    },
    "previous": {
      "all": 60
    },
    "change": 15
  }
}
```

#### Parameters

Accepts the same parameters as the [`/log/birdseye` endpoint](#get-v1logbirdseye).

### GET /v1/log/live-visitors

This endpoint returns a list of currently active visitors on the specified project. The psid is a unique identifier for the session, which can be used to get more information about the session using the [`/log/session` endpoint](#get-v1logsession).

```bash
curl 'https://api.swetrix.com/v1/log/live-visitors?pid=YOUR_PROJECT_ID'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
[
  {
    "dv": "desktop",
    "br": "Firefox",
    "os": "Windows",
    "cc": "GB",
    "psid": "9165978030580383830"
  },
  {
    "dv": "mobile",
    "br": "Chrome",
    "os": "Android",
    "cc": "UA",
    "psid": "9357848011560553100"
  }
]
```

#### Parameters

<hr />

**pid** (required)

The project ID to return live visitors for.

<hr />

### GET /v1/log/hb

This endpoint returns a list of heartbeat events for the specified project.

```bash
curl 'https://api.swetrix.com/log/hb?pids=["YOUR_PROJECT_ID"]'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "YOUR_PROJECT_ID": 2
}
```

#### Parameters

<hr />

**pids** (required)

An array of project IDs to return heartbeat events for.

<hr />

**pid**

A single project ID to return heartbeat events for. You can use either `pids` or `pid` parameter, but not both.

<hr />

### GET /v1/log/meta

This endpoint returns an array of custom event metadata.

```bash
curl 'https://api.swetrix.com/v1/log/meta?pid=YOUR_PROJECT_ID&timeBucket=day&period=7d&event=signup'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "result": [
    {
      "key": "Affiliate",
      "value": "Yes",
      "count": 1
    },
    {
      "key": "Affiliate",
      "value": "No",
      "count": 4
    },
    {
      "key": "OtherMetadata",
      "value": "AnyString",
      "count": 12
    }
  ],
  "appliedFilters": []
}
```

#### Parameters

The parameters are the same as for the [`/log` endpoint](#get-v1log), except additionally you must pass the following:

**event**

The name of the custom event to return metadata for.

### GET /v1/log/property

This endpoint returns an array of page tags for a particular custom property. For example, if you have a blog, you may want to pass some properties, such as "author", to our API along with your pageviews. The 'author' property can have multiple values, such as 'John', 'Tom' or 'Andrew'. You can then aggregate on these properties.

```bash
curl 'https://api.swetrix.com/v1/log/property?pid=YOUR_PROJECT_ID&timeBucket=day&period=7d&property=author'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "result": [
    {
      "key": "author",
      "value": "Andrew",
      "count": 17
    },
    {
      "key": "author",
      "value": "John",
      "count": 8
    },
    {
      "key": "author",
      "value": "Tom",
      "count": 3
    }
  ],
  "appliedFilters": []
}
```

#### Parameters

The parameters are the same as for the [`/log` endpoint](#get-v1log), except additionally you must pass the following:

**property**

The name of the property (tag) to return details for.

### GET /v1/log/sessions

This endpoint returns an array of individual sessions.

```bash
curl 'https://api.swetrix.com/v1/log/sessions?pid=YOUR_PROJECT_ID&period=7d&take=30&skip=0'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "sessions": [
    {
      "psid": "14287087333426119778",
      "cc": "IS",
      "os": "Windows",
      "br": "Firefox",
      "pageviews": 4,
      "sessionStart": "2025-05-11T16:09:06Z",
      "lastActivity": "2025-05-11T17:22:02Z",
      "isLive": 1,
      "sdur": 520
    },
    {
      "psid": "3653378394154006361",
      "cc": "GB",
      "os": "macOS",
      "br": "Safari",
      "pageviews": 2,
      "sessionStart": "2025-05-11T10:37:12Z",
      "lastActivity": "2025-05-11T10:37:23Z",
      "isLive": 0,
      "sdur": 11
    },
    {
      "psid": "1777747620282809424",
      "cc": null,
      "os": "macOS",
      "br": "Chrome",
      "pageviews": 34,
      "sessionStart": "2025-05-10T20:28:29Z",
      "lastActivity": "2025-05-10T22:23:36Z",
      "isLive": 0,
      "sdur": 115
    }
  ],
  "appliedFilters": [],
  "take": 30,
  "skip": 0
}
```

#### Parameters

<hr />

**pid** (required)

The project ID.

<hr />

**period** (required)

See [periods](#periods).

<hr />

**from** / **to**

Instead of specifying a fixed period, you can specify a custom time range using `from` and `to` parameters. Both parameters are optional, but if you specify `from`, you must also specify `to`. The format is `YYYY-MM-DD`.

<hr />

**timezone**

The timezone to use for the time range. The default is `Etc/GMT`. You can use any timezone supported by [day.js](https://day.js.org/docs/en/timezone/timezone/) library.

<hr />

**filters**

An array of [filter objects](#filters).

<hr />

**take**

The number of sessions to return. The default is `30`, max is `150`.

<hr />

**skip**

The number of sessions to skip. The default is `0`.

<hr />

### GET /v1/log/session

This endpoint returns information about a single session.

```bash
curl 'https://api.swetrix.com/v1/log/session?pid=YOUR_PROJECT_ID&psid=SESSION_IDENTIFIER'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "pages": [
    {
      "type": "pageview",
      "value": "/",
      "created": "2023-12-20T16:53:59Z"
    },
    {
      "type": "pageview",
      "value": "/signup",
      "created": "2023-12-20T16:55:03Z"
    },
    {
      "type": "event",
      "value": "SIGNUP",
      "created": "2023-12-20T16:56:11Z",
      "metadata": [
        {
          "key": "OAUTH_USED",
          "value": "true"
        }
      ]
    },
    {
      "type": "pageview",
      "value": "/dashboard",
      "created": "2023-12-20T16:56:13Z"
    },
    {
      "type": "pageview",
      "value": "/blog/how-to-do-stuff",
      "created": "2023-12-20T16:57:32Z",
      "metadata": [
        {
          "key": "author",
          "value": "James"
        }
      ]
    },
    {
      "type": "event",
      "value": "SOME_EVENT",
      "created": "2023-12-20T16:58:01Z"
    }
  ],
  "details": {
    "dv": "desktop",
    "br": "Firefox",
    "brv": "132.0",
    "os": "Windows",
    "osv": "10.0",
    "lc": "en-GB",
    "ref": "https://example.com",
    "so": null,
    "me": null,
    "ca": null,
    "te": null,
    "co": null,
    "cc": "GB",
    "rg": "England",
    "ct": "Liverpool",
    "sdur": 242,
    "isLive": 0
  },
  "psid": "14287087333426119778",
  "chart": {
    "x": [
      "2023-12-20 16:53:00",
      "2023-12-20 16:54:00",
      "2023-12-20 16:55:00",
      "2023-12-20 16:56:00",
      "2023-12-20 16:57:00",
      "2023-12-20 16:58:00"
    ],
    "visits": [1, 0, 1, 1, 1, 0]
  },
  "timeBucket": "minute"
}
```

#### Parameters

<hr />

**pid** (required)

The project ID.

<hr />

**psid** (required)

The session identifier.

<hr />

**timezone**

The timezone to use for the time range. The default is `Etc/GMT`. You can use any timezone supported by [day.js](https://day.js.org/docs/en/timezone/timezone/) library.

<hr />

### GET /v1/log/funnel

Returns a funnel analysis for a specific set of pages.

```bash
curl 'https://api.swetrix.com/v1/log/funnel?pid=YOUR_PROJECT_ID&pages=["/","/pricing","/signup"]&period=30d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "funnel": [
    {
      "page": "/",
      "count": 100,
      "dropoff": 0,
      "dropoffPercentage": 0
    },
    {
      "page": "/pricing",
      "count": 50,
      "dropoff": 50,
      "dropoffPercentage": 50
    },
    {
      "page": "/signup",
      "count": 10,
      "dropoff": 40,
      "dropoffPercentage": 80
    }
  ],
  "totalPageviews": 160
}
```

#### Parameters

The parameters are similar to the [`/log` endpoint](#get-v1log), with the addition of:

**pages** (optional)

A stringified JSON array of page paths to define the funnel steps.

**funnelId** (optional)

The ID of a saved funnel to retrieve.

### GET /v1/log/user-flow

Returns the user flow diagram data, showing how users navigate through your website.

```bash
curl 'https://api.swetrix.com/v1/log/user-flow?pid=YOUR_PROJECT_ID&period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

The parameters are similar to the [`/log` endpoint](#get-v1log).

### GET /v1/log/chart

Returns data for the main chart (visits, uniques, sessions duration, etc.) grouped by time bucket. This is useful when you only need the chart data without other aggregations.

```bash
curl 'https://api.swetrix.com/v1/log/chart?pid=YOUR_PROJECT_ID&timeBucket=day&period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

The parameters are the same as for the [`/log` endpoint](#get-v1log).

### GET /v1/log/performance/chart

Returns performance data for the chart (DNS, TLS, etc.) grouped by time bucket.

```bash
curl 'https://api.swetrix.com/v1/log/performance/chart?pid=YOUR_PROJECT_ID&timeBucket=day&period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

The parameters are the same as for the [`/log/performance` endpoint](#get-v1logperformance).

### GET /v1/log/captcha

Returns aggregated CAPTCHA statistics.

```bash
curl 'https://api.swetrix.com/v1/log/captcha?pid=YOUR_PROJECT_ID&period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

The parameters are the same as for the [`/log` endpoint](#get-v1log).

### GET /v1/log/keywords

Returns the search keywords data from Google Search Console integration.

```bash
curl 'https://api.swetrix.com/v1/log/keywords?pid=YOUR_PROJECT_ID&period=30d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

<hr />

**pid** (required)

The project ID.

<hr />

**period** (required)

See [periods](#periods).

<hr />

**from** / **to**

Custom date range.

<hr />

**timezone**

Timezone for the data.

<hr />

### GET /v1/log/custom-events

Returns aggregated data for specific custom events, grouped by time bucket.

```bash
curl 'https://api.swetrix.com/v1/log/custom-events?pid=YOUR_PROJECT_ID&period=7d&customEvents=["signup","purchase"]'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

The parameters are similar to the [`/log` endpoint](#get-v1log), with the addition of:

**customEvents** (required)

A stringified JSON array of custom event names to retrieve data for.

### GET /v1/log/profiles

Returns a list of user profiles (visitors).

```bash
curl 'https://api.swetrix.com/v1/log/profiles?pid=YOUR_PROJECT_ID&period=30d&take=20'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

The parameters are similar to the [`/log/sessions` endpoint](#get-v1logsessions), with the addition of:

**profileType** (optional)

Filter by profile type. Possible values: `all` (default), `anonymous`, `identified`.

### GET /v1/log/profile

Returns details for a specific user profile.

```bash
curl 'https://api.swetrix.com/v1/log/profile?pid=YOUR_PROJECT_ID&profileId=PROFILE_ID'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

<hr />

**pid** (required)

The project ID.

<hr />

**profileId** (required)

The unique identifier of the profile.

<hr />

**timezone**

Timezone for the data.

<hr />

**period**, **from**, **to**

Time range parameters.

<hr />

### GET /v1/log/profile/sessions

Returns a list of sessions for a specific user profile.

```bash
curl 'https://api.swetrix.com/v1/log/profile/sessions?pid=YOUR_PROJECT_ID&profileId=PROFILE_ID&take=20'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

Same as [`/log/sessions`](#get-v1logsessions), but requires `profileId`.

### GET /v1/log/errors

Returns a list of error events.

```bash
curl 'https://api.swetrix.com/v1/log/errors?pid=YOUR_PROJECT_ID&period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

Same as [`/log/sessions`](#get-v1logsessions), with an optional `options` parameter.

### GET /v1/log/get-error

Returns details for a specific error group (by error ID `eid`).

```bash
curl 'https://api.swetrix.com/v1/log/get-error?pid=YOUR_PROJECT_ID&eid=ERROR_ID'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

<hr />

**pid** (required)

The project ID.

<hr />

**eid** (required)

The error ID.

<hr />

**period**, **from**, **to**, **timezone**

Time range parameters.

<hr />

### GET /v1/log/error-overview

Returns an overview of error statistics (occurrences, users affected, etc.) for the chart.

```bash
curl 'https://api.swetrix.com/v1/log/error-overview?pid=YOUR_PROJECT_ID&period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

Same as [`/log` endpoint](#get-v1log).

### GET /v1/log/error-sessions

Returns a list of sessions affected by a specific error.

```bash
curl 'https://api.swetrix.com/v1/log/error-sessions?pid=YOUR_PROJECT_ID&eid=ERROR_ID'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

Same as [`/log/get-error`](#get-v1logget-error), with `take` and `skip`.

### GET /v1/log/filters

Returns available filter values for a specific column (e.g. all browser names).

```bash
curl 'https://api.swetrix.com/v1/log/filters?pid=YOUR_PROJECT_ID&type=br'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

**pid** (required)

The project ID.

**type** (required)

The column to get filters for (e.g., `br`, `os`, `cc`).

### GET /v1/log/errors-filters

Returns available filter values for error tracking.

```bash
curl 'https://api.swetrix.com/v1/log/errors-filters?pid=YOUR_PROJECT_ID&type=os'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

Same as `/filters`.

### GET /v1/log/filters/versions

Returns available versions (browser or OS) for filtering.

```bash
curl 'https://api.swetrix.com/v1/log/filters/versions?pid=YOUR_PROJECT_ID&type=traffic&column=br'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

**pid** (required)

The project ID.

**type** (required)

Data type: `traffic` or `errors`.

**column** (required)

Column: `br` or `os`.

### GET /goal/:id/stats

Returns statistics for a specific goal (conversions, conversion rate, trend).

```bash
curl 'https://api.swetrix.com/goal/GOAL_ID/stats?period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

**period**, **from**, **to**, **timezone**

Time range parameters.

### GET /goal/:id/chart

Returns chart data for a specific goal.

```bash
curl 'https://api.swetrix.com/goal/GOAL_ID/chart?period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

**period**, **from**, **to**, **timezone**, **timeBucket**

Time range parameters.

### GET /v1/feature-flag/:id/stats

Returns statistics for a specific feature flag (evaluations, true/false counts).

```bash
curl 'https://api.swetrix.com/v1/feature-flag/FLAG_ID/stats?period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

**period**, **from**, **to**, **timezone**

Time range parameters.

### GET /v1/feature-flag/:id/profiles

Returns a list of profiles that have evaluated a specific feature flag.

```bash
curl 'https://api.swetrix.com/v1/feature-flag/FLAG_ID/profiles?period=7d'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

#### Parameters

**period**, **from**, **to**, **timezone**

Time range parameters.

**take**, **skip**

Pagination parameters.

**result** (optional)

Filter by result (`true` or `false`).

## Common request examples

### Data on visitors from the UK who did not visit the website using a mobile device

This example returns the data about people from the UK who did not visit the website using mobile devices.

```bash
curl 'https://api.swetrix.com/log?pid=YOUR_PROJECT_ID&timeBucket=day&period=7d&filters=[{"column":"cc","filter":"GB","isExclusive":false},{"column":"dv","filter":"mobile","isExclusive":false}]'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "params": {
    "cc": [
      {
        "name": "GB",
        "count": 293
      }
    ],
    "rg": [
      {
        "name": "England",
        "cc": "GB",
        "count": 293
      }
    ],
    "ct": [
      {
        "name": "Liverpool",
        "cc": "GB",
        "count": 293
      }
    ],
    "dv": [
      {
        "name": "desktop",
        "count": 293
      }
    ],
    "brv": [
      {
        "name": "132.0",
        "br": "Firefox",
        "count": 200
      },
      {
        "name": "120.5",
        "br": "Chrome",
        "count": 93
      }
    ],
    "os": [
      {
        "name": "Windows",
        "count": 293
      }
    ],
    "osv": [
      {
        "name": "10.0",
        "os": "Windows",
        "count": 293
      }
    ],
    "lc": [
      {
        "name": "en-GB",
        "count": 280
      },
      {
        "name": "en-US",
        "count": 13
      }
    ],
    "dv": [
      {
        "name": "desktop",
        "count": 293
      }
    ],
    "ref": [
      {
        "name": "https://youtube.com/",
        "count": 41
      }
    ],
    "so": [],
    "me": [],
    "ca": [],
    "te": [],
    "co": []
  },
  "chart": {
    "x": [
      "2023-02-02 00:00:00",
      "2023-02-03 00:00:00",
      "2023-02-04 00:00:00",
      "2023-02-05 00:00:00",
      "2023-02-06 00:00:00",
      "2023-02-07 00:00:00",
      "2023-02-08 00:00:00",
      "2023-02-09 00:00:00"
    ],
    "visits": [73, 55, 21, 13, 21, 11, 98, 1],
    "uniques": [73, 55, 21, 13, 21, 11, 98, 1],
    "sdur": [43, 28, 29, 36, 50, 51, 52, 2]
  },
  "avgSdur": 43,
  "customs": {
    "SIGNUP": 7,
    "PROJECT_CREATED": 14,
    "ACCOUNT_DELETED": 2
  },
  "appliedFilters": [
    { "column": "cc", "filter": "GB", "isExclusive": false },
    { "column": "dv", "filter": "mobile", "isExclusive": true }
  ]
}
```
