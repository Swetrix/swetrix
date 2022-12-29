import { isInBrowser, isLocalhost, isAutomated, getLocale, getTimezone, getReferrer, getUTMCampaign, getUTMMedium, getUTMSource, getPath, } from './utils';
export const defaultPageActions = {
    stop() { },
};
const DEFAULT_API_HOST = 'https://api.swetrix.com/log';
export class Lib {
    constructor(projectID, options) {
        this.projectID = projectID;
        this.options = options;
        this.pageData = null;
        this.pageViewsOptions = null;
        this.perfStatsCollected = false;
        this.trackPathChange = this.trackPathChange.bind(this);
        this.heartbeat = this.heartbeat.bind(this);
    }
    track(event) {
        if (!this.canTrack()) {
            return;
        }
        const data = {
            pid: this.projectID,
            ...event,
        };
        this.sendRequest('custom', data);
    }
    trackPageViews(options) {
        if (!this.canTrack()) {
            return defaultPageActions;
        }
        if (this.pageData) {
            return this.pageData.actions;
        }
        this.pageViewsOptions = options;
        let hbInterval, interval;
        if (!options?.unique) {
            interval = setInterval(this.trackPathChange, 2000);
        }
        if (!options?.noHeartbeat) {
            setTimeout(this.heartbeat, 3000);
            hbInterval = setInterval(this.heartbeat, 28000);
        }
        const path = getPath();
        this.pageData = {
            path,
            actions: {
                stop: () => {
                    clearInterval(interval);
                    clearInterval(hbInterval);
                },
            },
        };
        this.trackPage(path, options?.unique);
        return this.pageData.actions;
    }
    getPerformanceStats() {
        if (!this.canTrack() || this.perfStatsCollected || !window.performance?.getEntriesByType) {
            return {};
        }
        const perf = window.performance.getEntriesByType('navigation')[0];
        if (!perf) {
            return {};
        }
        this.perfStatsCollected = true;
        return {
            // Network
            // @ts-ignore
            dns: perf.domainLookupEnd - perf.domainLookupStart,
            // @ts-ignore
            tls: perf.requestStart - perf.secureConnectionStart,
            // @ts-ignore
            conn: perf.secureConnectionStart - perf.connectStart,
            // @ts-ignore
            response: perf.responseEnd - perf.responseStart,
            // Frontend
            // @ts-ignore
            render: perf.domComplete - perf.domContentLoadedEventEnd,
            // @ts-ignore
            dom_load: perf.domContentLoadedEventEnd - perf.responseEnd,
            // @ts-ignore
            page_load: perf.loadEventStart,
            // Backend
            // @ts-ignore
            ttfb: perf.responseStart - perf.requestStart,
        };
    }
    heartbeat() {
        if (!this.pageViewsOptions?.heartbeatOnBackground && document.visibilityState === 'hidden') {
            return;
        }
        const data = {
            pid: this.projectID,
        };
        this.sendRequest('hb', data);
    }
    checkIgnore(path) {
        const ignore = this.pageViewsOptions?.ignore;
        if (Array.isArray(ignore)) {
            for (let i = 0; i < ignore.length; ++i) {
                if (ignore[i] === path)
                    return true;
                // @ts-ignore
                if (ignore[i] instanceof RegExp && ignore[i].test(path))
                    return true;
            }
        }
        return false;
    }
    // Tracking path changes. If path changes -> calling this.trackPage method
    trackPathChange() {
        if (!this.pageData)
            return;
        const newPath = getPath();
        const { path } = this.pageData;
        if (path !== newPath) {
            this.trackPage(newPath, false);
        }
    }
    trackPage(pg, unique = false) {
        if (!this.pageData)
            return;
        this.pageData.path = pg;
        if (this.checkIgnore(pg))
            return;
        const perf = this.getPerformanceStats();
        console.log(perf);
        const data = {
            pid: this.projectID,
            lc: getLocale(),
            tz: getTimezone(),
            ref: getReferrer(),
            so: getUTMSource(),
            me: getUTMMedium(),
            ca: getUTMCampaign(),
            unique,
            pg,
            // perf,
        };
        this.sendRequest('', data);
    }
    debug(message) {
        if (this.options?.debug) {
            console.log('[Swetrix]', message);
        }
    }
    canTrack() {
        if (this.options?.disabled) {
            this.debug('Tracking disabled: the \'disabled\' setting is set to true.');
            return false;
        }
        if (!isInBrowser()) {
            this.debug('Tracking disabled: script does not run in browser environment.');
            return false;
        }
        if (this.options?.respectDNT && window.navigator?.doNotTrack === '1') {
            this.debug('Tracking disabled: respecting user\'s \'Do Not Track\' preference.');
            return false;
        }
        if (!this.options?.debug && isLocalhost()) {
            return false;
        }
        if (isAutomated()) {
            this.debug('Tracking disabled: navigation is automated by WebDriver.');
            return false;
        }
        return true;
    }
    sendRequest(path, body) {
        const host = this.options?.apiURL || DEFAULT_API_HOST;
        const req = new XMLHttpRequest();
        req.open('POST', `${host}/${path}`, true);
        req.setRequestHeader('Content-Type', 'application/json');
        req.send(JSON.stringify(body));
    }
}
//# sourceMappingURL=Lib.js.map