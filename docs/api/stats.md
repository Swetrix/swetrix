---
title: Statistics API reference
slug: /statistics-api
---

Swetrix provides the ability to retrieve aggregated data not only through the UI, but also programmatically using API queries.

The statistics API provides several GET endpoints. These endpoints require some query parameters and return standard HTTP responses and a JSON-encoded body. API requests without a valid API key will fail (except for the publicly available API endpoints).

Each request must be authenticated with an API key using `X-Api-Key` HTTP header. You can obtain an API key in your Swetrix [account settings](https://swetrix.com/settings).

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
- **month** - 1 month.

### Periods
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
4. `quantiles` - it's a special measure, because instead of the regular metrics (e.g. `dns`, `tls`, etc.) it will return load time (the sum on all metrics) across 3 qunatiles: `p50`, `p75` and `p95`.

### Filters
Filters are used to aggregate data by specific parameters. For example, you can filter the data by country, browser, operating system, etc.

'Filter' is an object with the following structure:
```json
{
  "column":"cc",
  "filter":"GB",
  "isExclusive":false
}
```

- **column** - the column to filter by. Possible values are: `cc`, `pg`, `lc`, `br`, `os`, `dv`, `ref`, `so`, `me`, `ca`. You can find more detailed information about columns [here](/sdk-reference#addpaneltab).
- **filter** - the value to filter by. For example, if you want to filter by country, the value should be a country code (e.g. `GB` for Great Britain).
- **isExclusive** - whether to include or exclude the specified value. If `isExclusive` is `true`, the data will be filtered by the specified value. If `isExclusive` is `false`, the data will be filtered by all values except the specified one.

### Mode
The mode parameter specifies how the data is aggregated. Possible values are:
- **periodic** - data is aggregated by the specified time bucket (e.g. by day, week, etc.);
- **cumulative** - data is aggregated cumulatively (e.g. the number of visits for the current day is the sum of the number of visits for all previous days and the current day).

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
    "cc": {
      "UA": 3, "CZ": 1
    },
    "pg": {
      "/": 4
    },
    "lc": {
      "sk": 1, "en-GB": 3
    },
    "br": {
      "Chrome": 20
    },
    "os": {
      "Windows": 32
    },
    "dv": {
      "desktop": 33
    },
    "ref": {},
    "so": {},
    "me": {},
    "ca": {}
  },
  "chart": {
    "x": [
      "2023-02-02 00:00:00", "2023-02-03 00:00:00", "2023-02-04 00:00:00", "2023-02-05 00:00:00", "2023-02-06 00:00:00", "2023-02-07 00:00:00", "2023-02-08 00:00:00", "2023-02-09 00:00:00"
    ],
    "visits": [
      0, 2, 9, 12, 4, 7, 4, 0
    ],
    "uniques": [
      0, 2, 9, 10, 4, 7, 4, 0
    ],
    "sdur": [
      0, 54, 2, 126, 8, 8, 2
    ]
  },
  "avgSdur": 41,
  "customs": {},
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
    "cc": {
      "JO": 0.99, "AE": 4.07, "SG": 1.89, "UA": 1.05
    },
    "pg": {
      "/": 1.61
    },
    "dv": {
      "desktop": 1.38, "mobile": 4.36
    },
    "br": {
      "Chrome": 1.21, "Mobile Safari": 4.36, "Firefox": 1.99
    }
  },
  "chart": {
    "x": [
      "2023-02-02 00:00:00", "2023-02-03 00:00:00", "2023-02-04 00:00:00", "2023-02-05 00:00:00", "2023-02-06 00:00:00", "2023-02-07 00:00:00", "2023-02-08 00:00:00", "2023-02-09 00:00:00"
    ],
    "dns": [
      0, 0, 0.09, 0.05, 0.02, 0.05, 0.06, 0
    ],
    "tls": [
      0, 0.13, 0.06, 0.06, 0.07, 0.33, 0.34, 0
    ],
    "conn": [
      0, 0, 0.04, 0.03, 0.01, 0.02, 0.02, 0
    ],
    "response": [
      0, 0.01, 0, 0, 0, 0.37, 0, 0
    ],
    "render": [
      0, 0.01, 0.38, 0.17, 0.63, 0.07, 0.07, 0
    ],
    "domLoad": [
      0, 0.91, 0.48, 0.54, 0.69, 0.94, 1.22, 0
    ],
    "ttfb": [
      0, 0.06, 0.07, 0.07, 0.05, 0.1, 1.11, 0
    ]
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

### GET /v1/log/liveVisitors

This endpoint returns a list of currently active visitors on the specified project.

```bash
curl 'https://api.swetrix.com/v1/log/liveVisitors?pid=YOUR_PROJECT_ID'\
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
[
  {
    "dv": "desktop",
    "br": "Firefox",
    "os": "Windows",
    "cc": "GB"
  },
  {
    "dv": "mobile",
    "br": "Chrome",
    "os": "Android",
    "cc": "UA"
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
[
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
]
```

#### Parameters
The parameters are the same as for the [`/log` endpoint](#get-v1log), except additionally you must pass the following:

**event**

The name of the custom event to return metadata for.

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
      "active": 1,
      "cc": null,
      "os": "Windows",
      "br": "Firefox",
      "pageviews": 4,
      "created": "2023-12-20 16:53:59"
    },
    {
      "psid": "3653378394154006361",
      "active": 0,
      "cc": "GB",
      "os": "Mac OS",
      "br": "Safari",
      "pageviews": 1,
      "created": "2023-12-16 19:53:27"
    },
    {
      "psid": "1777747620282809424",
      "active": 0,
      "cc": "GB",
      "os": "Mac OS",
      "br": "Chrome",
      "pageviews": 3,
      "created": "2023-12-16 19:53:21"
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
      "created": "2023-12-20 16:53:59"
    },
    {
      "type": "pageview",
      "value": "/signup",
      "created": "2023-12-20 16:55:03"
    },
    {
      "type": "event",
      "value": "SIGNUP",
      "created": "2023-12-20 16:56:11"
    },
    {
      "type": "pageview",
      "value": "/dashboard",
      "created": "2023-12-20 16:56:13"
    },
    {
      "type": "pageview",
      "value": "/settings",
      "created": "2023-12-20 16:57:32"
    },
    {
      "type": "event",
      "value": "SOME_EVENT",
      "created": "2023-12-20 16:58:01"
    }
  ],
  "details": {
    "dv": "desktop",
    "br": "Firefox",
    "os": "Windows",
    "lc": "en-GB",
    "ref": "https://example.com",
    "so": null,
    "me": null,
    "ca": null,
    "cc": "GB",
    "rg": "England",
    "ct": "Liverpool",
    "sdur": 242
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
    "visits": [
      1,
      0,
      1,
      1,
      1,
      0
    ]
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
    "cc": {
      "GB": 293
    },
    "pg": {
      "/signup": 7,
      "/": 286
    },
    "lc": {
      "zh-CN": 2, "pt-PT": 1, "en-GB": 263, "pl": 2, "it": 1, "en-US": 10, "ru": 1, "pl-PL": 2, "en-IN": 1, "ro": 1, "pt-BR": 2, "ar": 4, "ro-RO": 2, "el": 1
    },
    "br": {
      "Samsung Browser": 39, "Huawei Browser": 1, "Chrome": 72, "Safari": 1, "Opera": 2, "GSA": 15, "Mobile Safari": 148, "Edge": 2, "Firefox": 10, "Facebook": 3
    },
    "os": {
      "iOS": 177, "Android": 116
    },
    "dv": {
      "mobile": 293
    },
    "ref": {
      "https://youtube.com/": 41, "https://www.reddit.com/": 27
    },
    "so": {},
    "me": {},
    "ca": {}
  },
  "chart": {
    "x": [
      "2023-02-02 00:00:00", "2023-02-03 00:00:00", "2023-02-04 00:00:00", "2023-02-05 00:00:00", "2023-02-06 00:00:00", "2023-02-07 00:00:00", "2023-02-08 00:00:00", "2023-02-09 00:00:00"
    ],
    "visits": [
      73, 55, 21, 13, 21, 11, 98, 1
    ],
    "uniques": [
      73, 55, 21, 13, 21, 11, 98, 1
    ],
    "sdur": [
      43, 28, 29, 36, 50, 51, 52, 2
    ]
  },
  "avgSdur": 43,
  "customs": {
    "SIGNUP": 7, "PROJECT_CREATED": 14, "ACCOUNT_DELETED": 2
  },
  "appliedFilters": [
    { "column": "cc", "filter": "GB", "isExclusive": false },
    { "column": "dv", "filter": "mobile", "isExclusive": true }
  ]
}
```

