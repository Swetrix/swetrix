---
title: Docusaurus
slug: /docusaurus-integration
---

After you sign up on Swetrix and create a new project, the only thing left is to add it to your website.

## Installation
1. Open your Docusaurus project.
2. Edit the `docusaurus.config.js` file and add the following inside `module.exports`:

```js
module.export = {
  ...
  scripts: [
    { src: 'https://swetrix.org/swetrix.js', defer: true },
    { src: 'js/setupswetrix.js', defer: true }
  ],
  ...
}
```

3. Create a new file at `static/js/setupswetrix.js` and add the following:

```js
document.addEventListener('DOMContentLoaded', function () {
  swetrix.init('YOUR_PROJECT_ID')
  swetrix.trackViews()
})
```

:::caution
It's very important not to forget to replace `YOUR_PROJECT_ID` with your actual Project ID you can find in the Dashboard, otherwise tracking won't work!
:::

## Check your installation
After installing Swetrix tracking script, go to your website and visit some pages.

Within a minute you should be able to see new pageviews being added to your project's dahsboard.
