---
title: Events API reference
slug: /events-api
---

With Swetrix you can record pageview or custom events programmatically manually. Usually this API is used when doing server-side tracking or in Mobile / Native applications.

We already provide various [integrations](/integrations) and a [script](/swetrix-js-reference) for that purpose, but if for some reason none of these options work for you, you can use the Events API instead.

## Concepts
### Unique visitors tracking
:::caution
For the unique (and live) visitors functionality to properly work, each request must have `User-Agent` and `X-Client-IP-Address` HTTP headers set. If you don't set these headers, the API will still work, but the unique visitors count will be incorrect.
:::

The API relies on client's IP address and User-Agent for creating a temporary session (a salted hash which is forever removed from our database 30 minutes after the last interaction or at 12:00 AM UTC, whatever happens first). We **never** store visitor identifiable information in our database.

### Request headers
#### User-Agent
This header is used to determine the browser, operating system and device type of the visitor. It's also used to determine whether the visitor is a bot or not.
We also use this header to create a temporary session for the visitor.

#### X-Client-IP-Address
This header is used to determine the IP address of the visitor. You have to forward the IP address of the visitor by using this header, otherwise the API will use the IP address of the server which is making the request (i.e. the IP address of your server), which will result in incorrect unique and live visitors data.

#### Content-Type
Must be set to `application/json` for all requests.

### Pageview event structure
#### Pageview payload
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `pid` | `string` | `true` | A project ID to record pageview event for |
| `tz` | `string` | `false` | Visitors timezone (it's used as a backup in case IP geolocation determinatino fails. I.e. if it's set to `Europe/Kiev` and IP geolocation fails, we will set country of this entry as `Ukraine`) |
| `pg` | `string` | `false` | A page to record pageview event for (e.g. `/home`). All our scripts send `pg` string with a slash (`/`) at the beginning, it's not a requirement but it's best to do the same so the data would be consistent if using together with our official scripts  |
| `prev` | `string` | `false` | Previous page user was on |
| `lc` | `string` | `false` | A locale of the user (e.g. `en-US` or `uk-UA`) |
| `ref` | `string` | `false` | A referrer URL (e.g. `https://example.com/`) |
| `so` | `string` | `false` | A source of the pageview (e.g. `ref`, `source` or `utm_source` GET parameter) |
| `me` | `string` | `false` | A medium of the pageview (e.g. `utm_medium` GET parameter) |
| `ca` | `string` | `false` | A campaign of the pageview (e.g. `utm_campaign` GET parameter) |
| `unique` | `boolean` | `false` | If set to true, only unique visits will be saved |
| `perf` | `object` | `false` | An object with performance metrics related to the page load. See [Performance metrics](#performance-metrics-payload) for more details |

#### Performance metrics payload
This section describes the structure of the `perf` object which is used to record performance metrics related to the page load.

All of the values are numbers in milliseconds.

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dns` | `number` | `false` | DNS Resolution time |
| `tls` | `number` | `false` | TLS handshake time |
| `conn` | `number` | `false` | Connection time |
| `response` | `number` | `false` | Response Time (Download) |
| `render` | `number` | `false` | Browser rendering the HTML page time |
| `dom_load` | `number` | `false` | DOM loading timing |
| `page_load` | `number` | `false` | Page load timing |
| `ttfb` | `number` | `false` | Time to first byte |

### Custom event structure
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `pid` | `string` | `true` | A project ID to record pageview event for |
| `ev` | `string` | `true` | An event identifier you want to track. This has to be a string, which:<br />1. Contains only English letters (a-Z A-Z), numbers (0-9), underscores (_) and dots (.).<br />2. Is fewer than 64 characters.<br />3. Starts with an English letter. |
| `unique` | `boolean` | `false` | If set to true, only 1 custom event per session will be saved |
| `pg` | `string` | `false` | A page that user sent data from (e.g. `/home`) |
| `lc` | `string` | `false` | A locale of the user (e.g. `en-US` or `uk-UA`) |
| `ref` | `string` | `false` | A referrer URL (e.g. `https://example.com/`) |
| `so` | `string` | `false` | A source of the pageview (e.g. `ref`, `source` or `utm_source` GET parameter) |
| `me` | `string` | `false` | A medium of the pageview (e.g. `utm_medium` GET parameter) |
| `ca` | `string` | `false` | A campaign of the pageview (e.g. `utm_campaign` GET parameter) |

### Heartbeat event structure
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `pid` | `string` | `true` | A project ID to record heartbeat event for |

## Endpoints
### POST /log
This endpoint records pageview events.

```bash title="Request"
curl -i -X POST https://api.swetrix.com/log \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/116.0" \
  -H "X-Client-IP-Address: 192.0.2.1" \
  -H "Content-Type: application/json" \
  -d '{"pid":"YOUR_PROJECT_ID","lc":"en-US","pg":"/"}'
```

```json title="Response (201 Created)"
{}
```

### POST /log/custom
This endpoint records custom events.

```bash title="Request"
curl -i -X POST https://api.swetrix.com/log/custom \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/116.0" \
  -H "X-Client-IP-Address: 192.0.2.1" \
  -H "Content-Type: application/json" \
  -d '{"pid":"YOUR_PROJECT_ID","lc":"en-US","pg":"/"}'
```

```json title="Response (201 Created)"
{}
```

### POST /log/hb
This endpoint is used for heartbeat events. The heartbeat events are used to determine whether the user session is still active. This way you are able to see 'Live visitors' counter in the dashboard panel.
It's recommended to send heartbeat events every 30 seconds. We also prolong the session lifetime after receiving a pageview or custom event.

```bash title="Request"
curl -i -X POST https://api.swetrix.com/log/hb \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/116.0" \
  -H "X-Client-IP-Address: 192.0.2.1" \
  -H "Content-Type: application/json" \
  -d '{"pid":"YOUR_PROJECT_ID"}'
```

```json title="Response (201 Created)"
{}
```

## Status and error codes
### 201 Created
The request was successful and the event was recorded.

### 400 Bad Request
This error is usually returned when the request body is malformed (for example, the `pid` parameter is missing) or the project is disabled.

### 402 Payment Required
This error is usually returned when the project is not active (i.e. the subscription is expired or quota is exceeded). Please go to the [Billing](https://swetrix.com/billing) page to see the current status and usage of your subscription.

### 403 Forbidden
This error is usually returned when `unique` parameter is set to `true` and the event is not unique, i.e. the pageview event has already been recorded for this session.

### 500 Internal Server Error
This error is usually returned when the server is unable to process the request due to a temporary issue (for example, the database is unavailable).
If you receive this error, please try again later. In case the issue persists, please [contact us](https://swetrix.com/contact).

## Common request examples

### Recording a pageview event using JavaScript fetch API
```javascript
fetch('https://api.swetrix.com/log', {
  method: 'POST',
  headers: {
    'User-Agent': 'FORWARD_CLIENT_USER_AGENT_HERE',
    'X-Client-IP-Address': 'FORWARD_CLIENT_IP_ADDRESS_HERE',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    pid: 'YOUR_PROJECT_ID',
    lc: 'en-US',
    pg: '/',
    prev: '/signup',
    tz: 'UTC',
    unique: false,
  }),
})
```

### Recording a custom event using Go net/http
```go
package main

import (
  "bytes"
  "encoding/json"
  "net/http"
)

func main() {
  payload, err := json.Marshal(map[string]interface{}{
    "pid": "YOUR_PROJECT_ID",
    "ev": "YOUR_EVENT_NAME",
    "unique": false,
  })
  if err != nil {
    panic(err)
  }

  req, err := http.NewRequest("POST", "https://api.swetrix.com/log/custom", bytes.NewBuffer(payload))
  if err != nil {
    panic(err)
  }

  req.Header.Set("User-Agent", "FORWARD_CLIENT_USER_AGENT_HERE")
  req.Header.Set("X-Client-IP-Address", "FORWARD_CLIENT_IP_ADDRESS_HERE")
  req.Header.Set("Content-Type", "application/json")

  client := &http.Client{}
  resp, err := client.Do(req)
  if err != nil {
    panic(err)
  }
  defer resp.Body.Close()
}
```

### Recording a heartbeat event using PHP cURL
```php
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, 'https://api.swetrix.com/log/hb');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
  'pid' => 'YOUR_PROJECT_ID',
]));

$headers = [
  'User-Agent: FORWARD_CLIENT_USER_AGENT_HERE',
  'X-Client-IP-Address: FORWARD_CLIENT_IP_ADDRESS_HERE',
  'Content-Type: application/json',
];

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$result = curl_exec($ch);
curl_close($ch);
```
