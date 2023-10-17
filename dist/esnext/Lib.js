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
        this.activePage = null;
        this.trackPathChange = this.trackPathChange.bind(this);
        this.heartbeat = this.heartbeat.bind(this);
    }
    track(event) {
        if (!this.canTrack()) {
            return;
        }
        const data = {
            pid: this.projectID,
            pg: this.activePage,
            lc: getLocale(),
            tz: getTimezone(),
            ref: getReferrer(),
            so: getUTMSource(),
            me: getUTMMedium(),
            ca: getUTMCampaign(),
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
        const path = getPath({
            hash: options?.hash,
            search: options?.search,
        });
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
            tls: perf.secureConnectionStart ? perf.requestStart - perf.secureConnectionStart : 0,
            // @ts-ignore
            conn: perf.secureConnectionStart ? perf.secureConnectionStart - perf.connectStart : perf.connectEnd - perf.connectStart,
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
        const newPath = getPath({
            hash: this.pageViewsOptions?.hash,
            search: this.pageViewsOptions?.search,
        });
        const { path } = this.pageData;
        if (path !== newPath) {
            this.trackPage(newPath, false);
        }
    }
    getPreviousPage() {
        // Assuming that this function is called in trackPage and this.activePage is not overwritten by new value yet
        // That method of getting previous page works for SPA websites
        if (this.activePage) {
            const shouldIgnore = this.checkIgnore(this.activePage);
            if (shouldIgnore && this.pageViewsOptions?.doNotAnonymise) {
                return null;
            }
            return shouldIgnore ? null : this.activePage;
        }
        // Checking if URL is supported by the browser (for example, IE11 does not support it)
        if (typeof URL === 'function') {
            // That method of getting previous page works for websites with page reloads
            const referrer = getReferrer();
            if (!referrer) {
                return null;
            }
            const { host } = location;
            try {
                const url = new URL(referrer);
                const { host: refHost, pathname } = url;
                if (host !== refHost) {
                    return null;
                }
                const shouldIgnore = this.checkIgnore(pathname);
                if (shouldIgnore && this.pageViewsOptions?.doNotAnonymise) {
                    return null;
                }
                return shouldIgnore ? null : pathname;
            }
            catch {
                return null;
            }
        }
        return null;
    }
    trackPage(pg, unique = false) {
        if (!this.pageData)
            return;
        this.pageData.path = pg;
        const shouldIgnore = this.checkIgnore(pg);
        if (shouldIgnore && this.pageViewsOptions?.doNotAnonymise)
            return;
        const perf = this.getPerformanceStats();
        let prev;
        if (!this.pageViewsOptions?.noUserFlow) {
            prev = this.getPreviousPage();
        }
        this.activePage = pg;
        this.submitPageView(shouldIgnore ? null : pg, prev, unique, perf);
    }
    submitPageView(pg, prev, unique, perf) {
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
            perf,
            prev,
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