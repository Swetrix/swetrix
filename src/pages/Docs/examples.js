export const umdBuildExample = `<script src="./analytics_script/dist/analytics.umd.min.js" defer></script>

<script>
  document.addEventListener('DOMContentLoaded', () => {
    // Initialising the script with the Project ID
    // you can find in the dashboard
    analytics.init('YOUR_PROJECT_ID')

    // Tracking page views
    analytics.trackViews()
  })
</script>
`

export const trackPageView = `analytics.trackViews()`

export const init = `analytics.init('YOUR_PROJECT_ID', {
  // When set to true, all tracking logs will be
  // printed to console and localhost events will be sent to server.
  debug: false,

  // When set to true, the tracking library won't send any data to server.
  // Useful for development purposes when this value is set based on '.env' var.
  disabled: false,

  // By setting this flag to true, we will not collect ANY kind of data
  // about the user with the DNT setting.
  // This setting is not true by default because our service
  // anonymises all incoming data and does not pass it on
  // to any third parties under any circumstances
  respectDNT: false,
})
`

export const trackViews = `analytics.trackViews()`
