---
title: Teams, API & Integrations
slug: /teams-api-integrations
---

import useBaseUrl from '@docusaurus/useBaseUrl';

Beyond basic profile settings, Swetrix offers powerful tools for collaboration, automation, and customisation.

## Organisations (Teams)

Organisations allow you to collaborate with your team members on multiple projects. Instead of sharing a password or inviting users to individual projects one by one, you can group projects under an Organisation and give your team access to all of them at once.

### Creating an Organisation

1.  Navigate to the **[Organisations](/organisations)** page from the dashboard menu.
2.  Click the **New organisation** button.
3.  Enter a name for your organisation and click **Create**.

### Managing Members

To manage your team, go to the Organisations page and click the **Settings** (gear icon) button on the organisation card.

- **Invite Members**: Click the **Invite** button in the "People" section. Enter their email address and select a role.
  - **Admin**: Can manage organisation settings, invite/remove members, and manage projects.
  - **Viewer**: Can only view projects and analytics.
- **Change Roles**: Click on a member's role to upgrade or downgrade them.
- **Remove Members**: Click the role dropdown and select **Remove member**.

### Assigning Projects

You can assign a project to an organisation in the **Project Settings -> Access** tab. Once assigned, all members of the organisation will have access to the project according to their organisation role.

## API Keys

Swetrix provides a personal API key that allows you to interact with the Swetrix API programmatically.

1.  Go to your **[Account Settings](https://swetrix.com/user-settings)**.
2.  Open the **Account** tab.
3.  Scroll down to the **API Key** section.
4.  Click **Generate new API key**.

:::warning
Treat your API key like a password. Do not share it or commit it to public repositories.
:::

## Integrations

Swetrix can send you reports and alerts directly to your favourite communication tools.

1.  Go to your **[Account Settings](https://swetrix.com/user-settings)**.
2.  Open the **Communications** tab.
3.  Scroll down to the **Integrations** section.

Supported integrations:

- **Telegram**: Receive alerts via the Swetrix Bot.
- **Slack**: Send notifications to a Slack channel via Webhook.
- **Discord**: Send notifications to a Discord channel via Webhook.

## Interface Settings

You can customise your dashboard experience in the **Interface** tab of your Account Settings.

- **Timezone**: Set your preferred reporting timezone.
- **Time Format**: Choose between 12-hour and 24-hour time formats.
- **Live Visitors in Title**: Enable this to show the current number of live visitors in your browser tab's title. This allows you to monitor traffic even when you are working in another tab.
