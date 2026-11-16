import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import type { TrackingSettings } from '~/lib/models/Project'

const require = createRequire(import.meta.url)
const dist = dirname(require.resolve('swetrix'))
export const managedTrackerVersion: string = require(
  join(dist, '..', 'package.json'),
).version

const tracker = readFileSync(join(dist, 'swetrix.js'), 'utf8').replace(
  /^\/\/# sourceMappingURL=.*$/m,
  '',
)

let recorder: string | undefined

export function readManagedRecorder(): string {
  return (recorder ??= readFileSync(join(dist, 'replaylibrary.min.js'), 'utf8'))
}

export function renderManagedTracker({
  pid,
  settings,
  apiURL,
  recorderURL,
}: {
  pid: string
  settings: TrackingSettings
  apiURL: string
  recorderURL: string
}): string {
  const options = {
    apiURL,
    events: { outboundLinks: settings.outboundLinks === true },
  }
  // Set the recorder URL after init so the SDK checks tracking eligibility before loading it.
  const replay =
    settings.sessionReplay === true
      ? `var recorderURL = ${JSON.stringify(recorderURL)};
if (script && script.src) {
  var tagURL = new URL(script.src);
  if (tagURL.pathname.endsWith('/p/' + pid + '.js')) {
    recorderURL = new URL(${JSON.stringify(`recorder-${managedTrackerVersion}.js`)}, tagURL).href;
  }
}
options.preloadSessionReplay = { rrwebUrl: recorderURL };
sdk.startSessionReplay({ privacy: 'total' });`
      : ''

  return `(function () {
if (window.swetrix && window.swetrix.LIB_INSTANCE) return;
var module = { exports: {} }, exports = module.exports;
${tracker}
var sdk = window.swetrix = module.exports;
var options = ${JSON.stringify(options)};
var pid = ${JSON.stringify(pid)};
var script = document.currentScript;
var proxyURL = script && script.getAttribute('data-api-url');
if (proxyURL) {
  try {
    var url = new URL(proxyURL, document.baseURI);
    if (url.protocol === 'http:' || url.protocol === 'https:') options.apiURL = url.href.replace(/\\/+$/, '');
  } catch {}
}
sdk.init(pid, options);
${settings.pageviews === true ? 'sdk.trackViews();' : ''}
${settings.errors === true ? 'sdk.trackErrors();' : ''}
${replay}
})();`
}
