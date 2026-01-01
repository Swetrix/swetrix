---
title: Admin API reference
slug: /admin-api
---

Swetrix provides the ability to control your projects (and soon your account) via an API as well.

Each request must be authenticated with an API key using `X-Api-Key` HTTP header. You can obtain an API key in your Swetrix [account settings](https://swetrix.com/user-settings).

Rate limit for the API depends on your plan, you can find more information on the billing (or the main) page.
As of 9 February 2023, the rate limits are as follows:

- **Free plan**: 600 requests per hour;
- **Any paid plan**: 600 requests per hour.

If you have special needs for more requests, please [contact us](https://swetrix.com/contact) to request more capacity.

## Concepts

### Projects manipulation

#### 'Create project' payload

| Name                  | Type      | Required | Description                                                                                                                                              |
| --------------------- | --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                | `string`  | `true`   | A display name for your project, max length is 50 chars.                                                                                                 |
| `isCaptcha`           | `boolean` | `false`  | (Only supported when creating a new project). Set to `true` if your project is a [CAPTCHA](/captcha/introduction) project. `false` by default.           |
| `isPasswordProtected` | `boolean` | `false`  | Set to `true` if your project's dashboard should be password protected. `false` by default.                                                              |
| `password`            | `string`  | `false`  | Required only if `isPasswordProtected` is set to `true`. That is the password unauthorised people will have to enter to access your project's dashboard. |
| `organisationId`      | `string`  | `false`  | Organisation you want to add this project to. You must be an owner or admin of the organisation to add a project to it.                                  |

#### 'Update project' payload

| Name                  | Type             | Description                                                                                                                                                                                                             |
| --------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                | `string`         | A display name for your project, max length is 50 chars.                                                                                                                                                                |
| `isCaptcha`           | `boolean`        | (Only supported when creating a new project). Set to `true` if your project is a [CAPTCHA](/captcha/introduction) project. `false` by default.                                                                          |
| `active`              | `boolean`        | Set to `true` if your project should be active and accept incoming traffic.                                                                                                                                             |
| `public`              | `boolean`        | Set to `true` if your project should have a publicly available dashboard.                                                                                                                                               |
| `isPasswordProtected` | `boolean`        | Set to `true` if your project's dashboard should be password protected. `false` by default.                                                                                                                             |
| `password`            | `string`         | Required only if `isPasswordProtected` is set to `true`. That is the password unauthorised people will have to enter to access your project's dashboard.                                                                |
| `origins`             | `Array<string>`  | An array of origins (domains) which are allowed to use script with your ProjectID. For example: `['cornell.edu', 'app.example.com', '*.gov.ua']`. By default all origins are allowed.                                   |
| `ipBlacklist`         | `Array<string>`  | An aeeay of IP addresses from which no analytics will be collected on this project. This functionality is handy if you want to ignore analytics from your IP. For example: `['172.126.10.16', '192.168.0.1/32', '::1']` |
| `botsProtectionLevel` | `off` or `basic` | Set to `basic` or `off`. `basic` will block common bots by user agent and `off` will allow all traffic. `basic` by default.                                                                                             |
| `organisationId`      | `string`         | Organisation you want to add this project to. You must be an owner or admin of the organisation to add a project to it.                                                                                                 |

### Organisations manipulation

#### 'Create organisation' payload

| Name   | Type     | Required | Description                                                   |
| ------ | -------- | -------- | ------------------------------------------------------------- |
| `name` | `string` | `true`   | A display name for your organisation, max length is 50 chars. |

#### 'Invite member' payload

| Name    | Type                           | Required | Description                                       |
| ------- | ------------------------------ | -------- | ------------------------------------------------- |
| `email` | `string`                       | `true`   | The email address of the user you want to invite. |
| `role`  | `owner` or `admin` or `viewer` | `true`   | The role to assign to the invited user.           |

#### 'Update member role' payload

| Name   | Type                           | Required | Description                           |
| ------ | ------------------------------ | -------- | ------------------------------------- |
| `role` | `owner` or `admin` or `viewer` | `true`   | The new role to assign to the member. |

### Funnels manipulation

#### 'Create funnel' payload

| Name    | Type            | Required | Description                                                                 |
| ------- | --------------- | -------- | --------------------------------------------------------------------------- |
| `name`  | `string`        | `true`   | A display name for your funnel, max length is 50 chars.                     |
| `pid`   | `string`        | `true`   | The Project ID the funnel belongs to.                                       |
| `steps` | `Array<string>` | `true`   | An array of paths for the funnel steps (e.g., `['/', '/signup', '/dash']`). |

#### 'Update funnel' payload

| Name    | Type            | Required | Description                                                                 |
| ------- | --------------- | -------- | --------------------------------------------------------------------------- |
| `id`    | `string`        | `true`   | The ID of the funnel to update.                                             |
| `pid`   | `string`        | `true`   | The Project ID the funnel belongs to.                                       |
| `name`  | `string`        | `true`   | A display name for your funnel, max length is 50 chars.                     |
| `steps` | `Array<string>` | `true`   | An array of paths for the funnel steps (e.g., `['/', '/signup', '/dash']`). |

### Annotations manipulation

#### 'Create annotation' payload

| Name   | Type     | Required | Description                               |
| ------ | -------- | -------- | ----------------------------------------- |
| `pid`  | `string` | `true`   | The Project ID the annotation belongs to. |
| `date` | `string` | `true`   | Date of the annotation (YYYY-MM-DD).      |
| `text` | `string` | `true`   | Annotation text (max 120 characters).     |

#### 'Update annotation' payload

| Name   | Type     | Required | Description                               |
| ------ | -------- | -------- | ----------------------------------------- |
| `id`   | `string` | `true`   | The ID of the annotation to update.       |
| `pid`  | `string` | `true`   | The Project ID the annotation belongs to. |
| `date` | `string` | `false`  | Date of the annotation (YYYY-MM-DD).      |
| `text` | `string` | `false`  | Annotation text (max 120 characters).     |

## Endpoints

### GET /v1/project

This endpoint allows you to list all your projects.

```bash title="Request"
curl -i -X GET https://api.swetrix.com/v1/project \
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

```json title="Response (200 OK)"
[
  {
    "id": "WvZCYTrOPzSK",
    "name": "My Project",
    "active": true,
    "public": false
  }
]
```

### GET /v1/project/:id

This endpoint allows you to get details of a specific project.

```bash title="Request"
curl -i -X GET https://api.swetrix.com/v1/project/WvZCYTrOPzSK \
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

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
  "botsProtectionLevel": "basic",
  "created": "2023-10-07T10:23:09.000Z",
  "organisation": {
    "id": "ORG_ID"
  }
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
  "origins": ["example.com", "example.co.uk"],
  "ipBlacklist": null,
  "active": true,
  "public": true,
  "isTransferring": false,
  "isAnalyticsProject": true,
  "isCaptchaProject": false,
  "isCaptchaEnabled": false,
  "captchaSecretKey": null,
  "botsProtectionLevel": "basic",
  "created": "2023-10-07T10:23:09.000Z",
  "isPasswordProtected": true,
  "organisation": {
    "id": "ORG_ID"
  }
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

### POST /v1/project/:id/pin

Pin a project to the top of the dashboard.

```bash title="Request"
curl -i -X POST https://api.swetrix.com/v1/project/WvZCYTrOPzSK/pin \
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

### DELETE /v1/project/:id/pin

Unpin a project from the top of the dashboard.

```bash title="Request"
curl -i -X DELETE https://api.swetrix.com/v1/project/WvZCYTrOPzSK/pin \
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

### PATCH /v1/project/:id/organisation

This endpoint allows you to assign a project to an organisation, or unassign it from an organisation. To unassign a project from an organisation, don't pass the request body.

```bash title="Request"
curl -i -X PATCH https://api.swetrix.com/v1/project/WvZCYTrOPzSK/organisation \
  -H "X-Api-Key: ${SWETRIX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"organisationId": "ORG_ID"}'
```

```json title="Response (204 No Content)"

```

### GET /v1/project/funnels/:pid

Get all funnels for a specific project.

```bash title="Request"
curl -i -X GET https://api.swetrix.com/v1/project/funnels/WvZCYTrOPzSK \
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

### POST /v1/project/funnel

Create a new funnel.

```bash title="Request"
curl -i -X POST https://api.swetrix.com/v1/project/funnel \
  -H "X-Api-Key: ${SWETRIX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Sign up","pid": "WvZCYTrOPzSK", "steps": ["/", "/signup"]}'
```

### PATCH /v1/project/funnel

Update an existing funnel.

```bash title="Request"
curl -i -X PATCH https://api.swetrix.com/v1/project/funnel \
  -H "X-Api-Key: ${SWETRIX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"id": "FUNNEL_ID", "name": "Sign up 2", "pid": "WvZCYTrOPzSK", "steps": ["/", "/signup"]}'
```

### DELETE /v1/project/funnel/:id/:pid

Delete a funnel.

```bash title="Request"
curl -i -X DELETE https://api.swetrix.com/v1/project/funnel/FUNNEL_ID/WvZCYTrOPzSK \
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

### GET /v1/project/annotations/:pid

Get all annotations for a specific project.

```bash title="Request"
curl -i -X GET https://api.swetrix.com/v1/project/annotations/WvZCYTrOPzSK \
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

### POST /v1/project/annotation

Create a new annotation.

```bash title="Request"
curl -i -X POST https://api.swetrix.com/v1/project/annotation \
  -H "X-Api-Key: ${SWETRIX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"text": "Marketing campaign", "pid": "WvZCYTrOPzSK", "date": "2023-10-01"}'
```

### PATCH /v1/project/annotation

Update an existing annotation.

```bash title="Request"
curl -i -X PATCH https://api.swetrix.com/v1/project/annotation \
  -H "X-Api-Key: ${SWETRIX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"id": "ANNOTATION_ID", "pid": "WvZCYTrOPzSK", "text": "Updated text"}'
```

### DELETE /v1/project/annotation/:id/:pid

Delete an annotation.

```bash title="Request"
curl -i -X DELETE https://api.swetrix.com/v1/project/annotation/ANNOTATION_ID/WvZCYTrOPzSK \
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

### GET /v1/organisation

List all organisations you are a member of.

```bash title="Request"
curl -i -X GET https://api.swetrix.com/v1/organisation \
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

### GET /v1/organisation/:orgId

Get details of a specific organisation.

```bash title="Request"
curl -i -X GET https://api.swetrix.com/v1/organisation/ORG_ID \
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

### POST /v1/organisation

Create a new organisation.

```bash title="Request"
curl -i -X POST https://api.swetrix.com/v1/organisation \
  -H "X-Api-Key: ${SWETRIX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Organisation"}'
```

### PATCH /v1/organisation/:orgId

Update an organisation.

```bash title="Request"
curl -i -X PATCH https://api.swetrix.com/v1/organisation/ORG_ID \
  -H "X-Api-Key: ${SWETRIX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Updated Organisation"}'
```

### DELETE /v1/organisation/:orgId

Delete an organisation. You must be the owner to do this.

```bash title="Request"
curl -i -X DELETE https://api.swetrix.com/v1/organisation/ORG_ID \
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
```

### POST /v1/organisation/:orgId/invite

Invite a new member to the organisation.

```bash title="Request"
curl -i -X POST https://api.swetrix.com/v1/organisation/ORG_ID/invite \
  -H "X-Api-Key: ${SWETRIX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email": "friend@example.com", "role": "viewer"}'
```

### PATCH /v1/organisation/member/:memberId

Update a member's role.

```bash title="Request"
curl -i -X PATCH https://api.swetrix.com/v1/organisation/member/MEMBER_ID \
  -H "X-Api-Key: ${SWETRIX_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

### DELETE /v1/organisation/member/:memberId

Remove a member from the organisation.

```bash title="Request"
curl -i -X DELETE https://api.swetrix.com/v1/organisation/member/MEMBER_ID \
  -H "X-Api-Key: ${SWETRIX_API_KEY}"
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
