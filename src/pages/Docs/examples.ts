/* eslint-disable no-useless-escape */

export const umdBuildExample = `<!-- Put this at the end of the <head> tag -->
<script src="https://swetrix.org/swetrix.js" defer></script>

<!-- Put this at the end of the <body> tag -->
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Initialising the script with the Project ID
    // you can find in the dashboard
    swetrix.init('YOUR_PROJECT_ID')

    // Tracking page views
    swetrix.trackViews()
  })
</script>

<noscript>
  <!--
  Don't forget to change YOUR_PROJECT_ID in the link to your Project ID
  -->
  <img
    src="https://api.swetrix.com/log/noscript?pid=YOUR_PROJECT_ID"
    alt=""
    referrerpolicy="no-referrer-when-downgrade"
  />
</noscript>
`

export const getUMDBuildExample = (pid: string) => `<!-- Put this at the end of the <body> tag -->
<script src="https://swetrix.org/swetrix.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    swetrix.init('${pid}')
    swetrix.trackViews()
  })
</script>
<noscript>
  <img
    src="https://api.swetrix.com/log/noscript?pid=${pid}"
    alt=""
    referrerpolicy="no-referrer-when-downgrade"
  />
</noscript>
`
