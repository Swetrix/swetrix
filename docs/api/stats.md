---
title: Statistics API reference
slug: /statistics-api
---

:::caution
The API is currently in beta and be a subject to change in future.
:::

Swetrix provides the ability to retrieve aggregated data not only through the UI, but also programmatically using API queries.

The statistics API provides several GET endpoints. These endpoints require some query parameters and return standard HTTP responses and a JSON-encoded body. API requests without a valid API key will fail (except for the publicly available API endpoints).

Each request must be authenticated with an API key using `X-Api-Key` HTTP header. You can obtain an API key in your Swetrix [account settings](https://swetrix.com/settings).

Rate limit for the API depends on your plan, you can find more information on the billing (or the main) page.
As for 9 February 2023, the rate limits are as follows:
- **Free plan**: 5 requests per hour;
- **Any paid plan**: 600 requests per hour.

If you have special needs for more requests, please contact us to request more capacity.

## Concepts
### Time buckets
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

:::info
`Time buckets` and `periods` are predefined values that you can use in your API requests. The API won't accept any other values. If you want to specify a custom time range, use `from` and `to` parameters in your aggregation requests.
:::

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

## Endpoints
### GET /v1/log
This endpoint returns the aggregated traffic data for your project. This is the exact same data you see in the Traffic tab of your Dashboard, but represented as a JSON entity.

```bash
curl 'https://api.swetrix.com/v1/log?pid=YOUR_PROJECT_ID&timeBucket=day&period=7d'
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

```bash
curl 'https://api.swetrix.com/v1/log/performance?pid=YOUR_PROJECT_ID&timeBucket=day&period=7d'
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
- `thisWeek` - the number of pageviews for the current week;
- `lastWeek` - the number of pageviews for the previous week;
- `thisWeekUnique` - the number of unique visitors for the current week;
- `lastWeekUnique` - the number of unique visitors for the previous week;
- `percChange` - the percentage change in the number of visits between the current and previous weeks;
- `percChangeUnique` - the percentage change in the number of unique visitors between the current and previous weeks.

```bash
curl 'https://api.swetrix.com/v1/log/birdseye?pids=["YOUR_PROJECT_ID"]'
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response"
{
  "YOUR_PROJECT_ID": {
    "thisWeek": 2461,
    "lastWeek": 1910,
    "thisWeekUnique": 1458,
    "lastWeekUnique": 1030,
    "percChange": 128.85,
    "percChangeUnique": 141.55
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

### GET /v1/log/liveVisitors

This endpoint returns a list of currently active visitors on the specified project.

```bash
curl 'https://api.swetrix.com/v1/log/liveVisitors?pid=YOUR_PROJECT_ID'
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
curl 'https://api.swetrix.com/log/hb?pids=["YOUR_PROJECT_ID"]'
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

## Common request examples

### Data on visitors from the UK who did not visit the website using a mobile device

This example returns the data about people from the UK who did not visit the website using mobile devices.

```bash
curl 'https://api.swetrix.com/log?pid=YOUR_PROJECT_ID&timeBucket=day&period=7d&filters=[{"column":"cc","filter":"GB","isExclusive":false},{"column":"dv","filter":"mobile","isExclusive":false}]'
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

