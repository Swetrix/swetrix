---
title: Google Tag Manager
slug: /gtm-integration
---

import useBaseUrl from '@docusaurus/useBaseUrl';

You can use Google Tag Manager to add the Swetrix tracking script to your website.

## Installation (Swetrix Loader tag)
1. Sign in to your Google Tag Manager account, click on **Tags** and then **New**.
<img alt="Creating a new tag" src={useBaseUrl('img/integrations/gtm/gtm-1.png')} />

2. Under the **Tag Configuration** section, click on "Choose a tag type to begin set-up...".
<img alt="Tag Configuration" src={useBaseUrl('img/integrations/gtm/gtm-2.png')} />


3. Select **Custom HTML**
<img alt="Custom HTML" src={useBaseUrl('img/integrations/gtm/gtm-3.png')} />

4. In the HTML input field, paste the following code:
```html
<script src="https://swetrix.org/swetrix.js" defer></script>
```
This code is responsible for loading the Swetrix script into your website. We will configure the tracking script later in this tutorial.

5. Under **Triggering** section, click on "Choose a trigger to mage this tag fire..." and select **All pages** (or alternatively, you can filter the pages you want Swetrix to be enabled on as well).

6. Give your tag a name, change "Untitled Tag" to something like **Swetrix Loader**. The result should look like this:
<img alt="Final result" src={useBaseUrl('img/integrations/gtm/gtm-4.png')} />

7. Click on the **Save** button.

## Set up (Swetrix Configuration tag)
After you verified that the loader tag looks fine, you will need to create another tag. The purpose of the second tag is to configure the tracking script you installed before. If you do not create the second tag, Swetrix will not track your analytics events.

1. Go to the **Tags** again and click on **New**.
   
2. Under the **Tag Configuration** section, click on "Choose a tag type to begin set-up...".

3. Select **Custom HTML**.

4. In the HTML input field, paste the following code:
```html
<script>
  if (document.readyState !== 'loading') {
    swetrixInit();
  } else {
    document.addEventListener('DOMContentLoaded', swetrixInit);
  }
  
  function swetrixInit() {
    // Here you can configure Swetrix for your needs
    swetrix.init('YOUR_PROJECT_ID')
    swetrix.trackViews()
  }
</script>
```

:::caution
Don't forget to replace `YOUR_PROJECT_ID` with your actual Project ID you can find in the Dashboard, otherwise tracking won't work.
You can also refer to our detailed [tracking script reference](/swetrix-js-reference) for more advanced configuration.
:::

5. Give your tag a name, change "Untitled Tag" to something like **Swetrix Configuration**.

6. Under the **Tag Configuration** section, click on **Advanced Settings** and then **Tag Sequencing**. Click on the **Fire a tag before Swetrix Configuration fires** and select **Swetrix Loader** (the tag we've set up before).
<img alt="Configuration tag setup" src={useBaseUrl('img/integrations/gtm/gtm-5.png')} />

7. Click on "Don't fire Swetrix Configuration if Swetrix Loader fails or is paused". Setting this up will make sure that Swetrix config will execute after the tracking script has loaded.

8. Under **Triggering** section, click on "Choose a trigger to mage this tag fire..." and select **All pages**.

9. Click on the **Save** button.

10. Click on the **Submit** button on the top right corner of the page.

11. Then click the **Publish** button to apply newly created tags.

## Check your installation
After setting up the Swetrix analytics tag, go to your website and visit some pages.

Within a minute you should be able to see new pageviews being added to your project's dahsboard.
