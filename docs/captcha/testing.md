---
title: Testing
slug: /captcha/testing
---

## Dummy project IDs
You can use the following project IDs for testing.

| Project ID | Description |
|------------|-------------|
| AP00000000000 | Always pass captcha without manual verification. |
| MP00000000000 | Fail automatic verification, but always pass manual. |
| FAIL000000000 | Always fail captcha. |

## Dummy secret keys
You can use the following secret keys for testing.

| Secret Key | Description |
|------------|-------------|
| PASS000000000000000000 | Always successfully validate captcha. |
| FAIL000000000000000000 | Always fail to validate captcha. |
| USED000000000000000000| Always fail to validate captcha because it has been used. |
