---
title: Admin API reference
slug: /admin-api
---

Swetrix provides the ability to control your projects (and soon your account) via an API as well.

Each request must be authenticated with an API key using `X-Api-Key` HTTP header. You can obtain an API key in your Swetrix [account settings](https://swetrix.com/settings).

Rate limit for the API depends on your plan, you can find more information on the billing (or the main) page.
As of 9 February 2023, the rate limits are as follows:
- **Free plan**: 600 requests per hour;
- **Any paid plan**: 600 requests per hour.

If you have special needs for more requests, please [contact us](https://swetrix.com/contact) to request more capacity.

## Concepts
### Projects manipulation
#### 'Create project' / 'Update project' payload
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | `true` | A display name for your project, max length is 50 chars. |
| `isCaptcha` | `boolean` | `false` | (Only supported when creating a new project). Set to `true` if your project is a [CAPTCHA](/captcha/introduction) project. `false` by default. |
| `public` | `boolean` | `false` | Set to `true` if your project should have a publicly available dashboard. `false` by default. |
| `isPasswordProtected` | `boolean` | `false` | Set to `true` if your project's dashboard should be password protected. `false` by default. |
| `password` | `string` | `false` | Required only if `isPasswordProtected` is set to `true`. That is the password unauthorised people will have to enter to access your project's dashboard. |
| `origins` | `Array<string>` | `false` | An array of origins (domains) which are allowed to use script with your ProjectID. For example: `['cornell.edu', 'app.example.com', '*.gov.ua']`. By default all origins are allowed. |
| `ipBlacklist` | `Array<string>` | `false` | An aeeay of IP addresses from which no analytics will be collected on this project. This functionality is handy if you want to ignore analytics from your IP. For example: `['172.126.10.16', '192.168.0.1/32', '::1']` |

## Endpoints
### POST /v1/project
This endpoint allows you to create a new project.

```bash title="Request"
curl -i -X POST https://api.swetrix.com/v1/project \
  -H "X-Api-Key: ${SWETRIX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "PASSWORD PROTECTED","isPasswordProtected": true,"password": "12345678"}'
```

```json title="Response (201 Created)"
{
  "id": "WvZCYTrOPzSK",
  "name": "PASSWORD PROTECTED",
  "origins": [],
  "isPasswordProtected": true,
  "ipBlacklist": null,
  "captchaSecretKey": null,
  "active": true,
  "public": false,
  "isTransferring": false,
  "isAnalyticsProject": true,
  "isCaptchaProject": false,
  "isCaptchaEnabled": false,
  "created": "2023-10-07T10:23:09.000Z"
}
```

### PUT /v1/project/:id
This endpoint allows you to edit an existing project.

```bash title="Request"
curl -i -X PUT https://api.swetrix.com/v1/project/WvZCYTrOPzSK \
  -H "X-Api-Key: ${SWETRIX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"origins": ["example.com", "example.co.uk"],"public": true}'
```

```json title="Response (200 OK)"
{
  "id": "WvZCYTrOPzSK",
  "name": "PASSWORD PROTECTED",
  "origins": [
    "example.com",
    "example.co.uk"
  ],
  "ipBlacklist": null,
  "active": true,
  "public": true,
  "isTransferring": false,
  "isAnalyticsProject": true,
  "isCaptchaProject": false,
  "isCaptchaEnabled": false,
  "captchaSecretKey": null,
  "created": "2023-10-07T10:23:09.000Z",
  "isPasswordProtected": true
}
```

### DELETE /v1/project/:id
This endpoint allows you to delete a project.

```bash title="Request"
curl -i -X DELETE https://api.swetrix.com/v1/project/WvZCYTrOPzSK \
  -H "X-Api-Key: ${SWETRIX_API_KEY}" \
  -H "Content-Type: application/json"
```

```json title="Response (204 No Content)"
```

## Status and error codes
### 200 OK
Typical successful response when updating a project or account settings.

### 201 Created
The request was successful and the project was created.

### 204 No Content
The request was successful and there is no data to return. Usually this code is sent when deleting an entity.

### 400 Bad Request
This error is usually returned when the request body is malformed (for example, the `pid` parameter is missing or invalid).

### 500 Internal Server Error
This error is usually returned when the server is unable to process the request due to a temporary problem (for example, the database is unavailable).
If you receive this error, please try again later. If the problem persists, please [contact us](https://swetrix.com/contact).
