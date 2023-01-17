---
title: Extensions SDK reference
slug: /sdk-reference
---

## Event listeners
Event listeners allow you to listen to the specific events from the Swetrix Dashboard and run your custom code based on it.
The method `addEventListener` works by adding a function to the list of event listeners for the specified event type on which it's called.

If the function or object is already in the list of event listeners for this target, the function or object is not added a second time.

Here is a basic example of an event listener:
```javascript
(async (sdk) => {
  sdk.addEventListener('projectinfo', ({ id }) => {
    // Your code goes here..
  })
})
```

Currently, the following events are available:
1. `load` - The event is triggered when the dashboard loads a new set of analytics data. For example, when user opens dashboard for the first time, changes the data range or time bucket.
2. `timeupdate` - This event is triggered when user changes the time bucket, time perios or sets the date range.
3. `filtersupdate` - This event is triggered when user changes the filters.
4. `projectinfo` - This event is triggered on load and it supplies information about the project it's running on.

## addExportDataRow()
The `addExportDataRow` function adds a new export data row into the 'Export data' dropdown.
The function takes 2 parameters:
1. The name of the row.
2. The callback which is called when the user clicks on the row.

Here is an example of how to use this function:
```javascript
(async (sdk) => {
  sdk.addExportDataRow('As JSON', () => {
    // Your code goes here..
  })
})
```

## removeExportDataRow()
The `removeExportDataRow` function removes an export data row from the dropdown. It takes the name of the export data row as a parameter.

```javascript
sdk.removeExportDataRow('As JSON')
```

## addPanelTab()

The `addPanelTab` function allows you to add a new panel tab into the dashboard panels.

For example, Swetrix has a Country panel with 2 pre-built tabs: countries list and a map.
By using this method, you can add a custom tab with a custom HTML (or just text) content.

This function takes 3 parameters:
1. Panel ID - the ID of the panel where you want to add a new tab.
2. The content of your tab, can be either text or stringified HTML.
3. `onOpen` callback - a callback that is called when the user opens the tab.

```javascript
sdk.addPanelTab('cc', '<h2>Custom Content</h2>', () => {
  // This part is triggered when the tab is opened
  // Your code goes here..
})
```

Currently, Swetrix supports the following panels you can inject a tab into:
1. `cc` - Country
2. `pg` - Page
3. `lc` - Locale
4. `ref` - Referrer
5. `dv` - Device type
6. `br` - Browser
7. `os` - OS name
8. `so` - utm_source
9. `me` - utm_medium
10. `ca` - utm_campaign

## removePanelTab()

The `removePanelTab` function allows you to remove a panel tab from the dashboard panels. It takes the ID of the panel as a parameter.

```javascript
sdk.removePanelTab('cc')
```