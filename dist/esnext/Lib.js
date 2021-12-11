import { isInBrowser, isLocalhost, isAutomated, getLocale, getTimezone, getReferrer, getUTMCampaign, getUTMMedium, getUTMSource, getPath, } from './utils';
const DEFAULT_API_HOST = 'https://api.swetrix.com/log';
export class Lib {
    constructor(projectID, options) {
        this.projectID = projectID;
        this.options = options;
        this.pageData = null;
        this.pageViewsOptions = null;
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
            return;
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
        };
        this.sendRequest('', data);
    }
    debug(message) {
        if (this.options?.debug) {
            console.log('[Swetrix]', message);
        }
    }
    canTrack() {
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