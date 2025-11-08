const findInSearch = (exp) => {
    const res = location.search.match(exp);
    return (res && res[2]) || undefined;
};
const utmSourceRegex = /[?&](ref|source|utm_source)=([^?&]+)/;
const utmCampaignRegex = /[?&](utm_campaign)=([^?&]+)/;
const utmMediumRegex = /[?&](utm_medium)=([^?&]+)/;
const utmTermRegex = /[?&](utm_term)=([^?&]+)/;
const utmContentRegex = /[?&](utm_content)=([^?&]+)/;
const isInBrowser = () => {
    return typeof window !== 'undefined';
};
const isLocalhost = () => {
    return (location === null || location === void 0 ? void 0 : location.hostname) === 'localhost' || (location === null || location === void 0 ? void 0 : location.hostname) === '127.0.0.1' || (location === null || location === void 0 ? void 0 : location.hostname) === '';
};
const isAutomated = () => {
    return navigator === null || navigator === void 0 ? void 0 : navigator.webdriver;
};
const getLocale = () => {
    return typeof navigator.languages !== 'undefined' ? navigator.languages[0] : navigator.language;
};
const getTimezone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    catch (e) {
        return;
    }
};
const getReferrer = () => {
    return document.referrer || undefined;
};
const getUTMSource = () => findInSearch(utmSourceRegex);
const getUTMMedium = () => findInSearch(utmMediumRegex);
const getUTMCampaign = () => findInSearch(utmCampaignRegex);
const getUTMTerm = () => findInSearch(utmTermRegex);
const getUTMContent = () => findInSearch(utmContentRegex);
/**
 * Function used to track the current page (path) of the application.
 * Will work in cases where the path looks like:
 * - /path
 * - /#/path
 * - /path?search
 * - /path?search#hash
 * - /path#hash?search
 *
 * @param options - Options for the function.
 * @param options.hash - Whether to trigger on hash change.
 * @param options.search - Whether to trigger on search change.
 * @returns The path of the current page.
 */
const getPath = (options) => {
    let result = location.pathname || '';
    if (options.hash) {
        const hashIndex = location.hash.indexOf('?');
        const hashString = hashIndex > -1 ? location.hash.substring(0, hashIndex) : location.hash;
        result += hashString;
    }
    if (options.search) {
        const hashIndex = location.hash.indexOf('?');
        const searchString = location.search || (hashIndex > -1 ? location.hash.substring(hashIndex) : '');
        result += searchString;
    }
    return result;
};

const defaultActions = {
    stop() { },
};
const DEFAULT_API_HOST = 'https://api.swetrix.com/log';
class Lib {
    constructor(projectID, options) {
        this.projectID = projectID;
        this.options = options;
        this.pageData = null;
        this.pageViewsOptions = null;
        this.errorsOptions = null;
        this.perfStatsCollected = false;
        this.activePage = null;
        this.errorListenerExists = false;
        this.trackPathChange = this.trackPathChange.bind(this);
        this.heartbeat = this.heartbeat.bind(this);
        this.captureError = this.captureError.bind(this);
    }
    captureError(event) {
        var _a, _b, _c, _d;
        if (typeof ((_a = this.errorsOptions) === null || _a === void 0 ? void 0 : _a.sampleRate) === 'number' && this.errorsOptions.sampleRate >= Math.random()) {
            return;
        }
        this.submitError({
            // The file in which error occured.
            filename: event.filename,
            // The line of code error occured on.
            lineno: event.lineno,
            // The column of code error occured on.
            colno: event.colno,
            // Name of the error, if not exists (i.e. it's a custom thrown error). The initial value of name is "Error", but just in case lets explicitly set it here too.
            name: ((_b = event.error) === null || _b === void 0 ? void 0 : _b.name) || 'Error',
            // Description of the error. By default, we use message from Error object, is it does not contain the error name
            // (we want to split error name and message so we could group them together later in dashboard).
            // If message in error object does not exist - lets use a message from the Error event itself.
            message: ((_c = event.error) === null || _c === void 0 ? void 0 : _c.message) || event.message,
            // Stack trace of the error, if available.
            stackTrace: (_d = event.error) === null || _d === void 0 ? void 0 : _d.stack,
        }, true);
    }
    trackErrors(options) {
        if (this.errorListenerExists || !this.canTrack()) {
            return defaultActions;
        }
        this.errorsOptions = options;
        window.addEventListener('error', this.captureError);
        this.errorListenerExists = true;
        return {
            stop: () => {
                window.removeEventListener('error', this.captureError);
                this.errorListenerExists = false;
            },
        };
    }
    submitError(payload, evokeCallback) {
        var _a, _b, _c;
        const privateData = {
            pid: this.projectID,
        };
        const errorPayload = {
            pg: this.activePage ||
                getPath({
                    hash: (_a = this.pageViewsOptions) === null || _a === void 0 ? void 0 : _a.hash,
                    search: (_b = this.pageViewsOptions) === null || _b === void 0 ? void 0 : _b.search,
                }),
            lc: getLocale(),
            tz: getTimezone(),
            ...payload,
        };
        if (evokeCallback && ((_c = this.errorsOptions) === null || _c === void 0 ? void 0 : _c.callback)) {
            const callbackResult = this.errorsOptions.callback(errorPayload);
            if (callbackResult === false) {
                return;
            }
            if (callbackResult && typeof callbackResult === 'object') {
                Object.assign(errorPayload, callbackResult);
            }
        }
        Object.assign(errorPayload, privateData);
        this.sendRequest('error', errorPayload);
    }
    async track(event) {
        var _a, _b;
        if (!this.canTrack()) {
            return;
        }
        const data = {
            ...event,
            pid: this.projectID,
            pg: this.activePage ||
                getPath({
                    hash: (_a = this.pageViewsOptions) === null || _a === void 0 ? void 0 : _a.hash,
                    search: (_b = this.pageViewsOptions) === null || _b === void 0 ? void 0 : _b.search,
                }),
            lc: getLocale(),
            tz: getTimezone(),
            ref: getReferrer(),
            so: getUTMSource(),
            me: getUTMMedium(),
            ca: getUTMCampaign(),
            te: getUTMTerm(),
            co: getUTMContent(),
        };
        await this.sendRequest('custom', data);
    }
    trackPageViews(options) {
        if (!this.canTrack()) {
            return defaultActions;
        }
        if (this.pageData) {
            return this.pageData.actions;
        }
        this.pageViewsOptions = options;
        let interval;
        if (!(options === null || options === void 0 ? void 0 : options.unique)) {
            interval = setInterval(this.trackPathChange, 2000);
        }
        setTimeout(this.heartbeat, 3000);
        const hbInterval = setInterval(this.heartbeat, 28000);
        const path = getPath({
            hash: options === null || options === void 0 ? void 0 : options.hash,
            search: options === null || options === void 0 ? void 0 : options.search,
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
        this.trackPage(path, options === null || options === void 0 ? void 0 : options.unique);
        return this.pageData.actions;
    }
    getPerformanceStats() {
        var _a;
        if (!this.canTrack() || this.perfStatsCollected || !((_a = window.performance) === null || _a === void 0 ? void 0 : _a.getEntriesByType)) {
            return {};
        }
        const perf = window.performance.getEntriesByType('navigation')[0];
        if (!perf) {
            return {};
        }
        this.perfStatsCollected = true;
        return {
            // Network
            dns: perf.domainLookupEnd - perf.domainLookupStart, // DNS Resolution
            tls: perf.secureConnectionStart ? perf.requestStart - perf.secureConnectionStart : 0, // TLS Setup; checking if secureConnectionStart is not 0 (it's 0 for non-https websites)
            conn: perf.secureConnectionStart
                ? perf.secureConnectionStart - perf.connectStart
                : perf.connectEnd - perf.connectStart, // Connection time
            response: perf.responseEnd - perf.responseStart, // Response Time (Download)
            // Frontend
            render: perf.domComplete - perf.domContentLoadedEventEnd, // Browser rendering the HTML time
            dom_load: perf.domContentLoadedEventEnd - perf.responseEnd, // DOM loading timing
            page_load: perf.loadEventStart, // Page load time
            // Backend
            ttfb: perf.responseStart - perf.requestStart,
        };
    }
    heartbeat() {
        var _a;
        if (!((_a = this.pageViewsOptions) === null || _a === void 0 ? void 0 : _a.heartbeatOnBackground) && document.visibilityState === 'hidden') {
            return;
        }
        const data = {
            pid: this.projectID,
        };
        this.sendRequest('hb', data);
    }
    // Tracking path changes. If path changes -> calling this.trackPage method
    trackPathChange() {
        var _a, _b;
        if (!this.pageData)
            return;
        const newPath = getPath({
            hash: (_a = this.pageViewsOptions) === null || _a === void 0 ? void 0 : _a.hash,
            search: (_b = this.pageViewsOptions) === null || _b === void 0 ? void 0 : _b.search,
        });
        const { path } = this.pageData;
        if (path !== newPath) {
            this.trackPage(newPath, false);
        }
    }
    trackPage(pg, unique = false) {
        if (!this.pageData)
            return;
        this.pageData.path = pg;
        const perf = this.getPerformanceStats();
        this.activePage = pg;
        this.submitPageView({ pg }, unique, perf, true);
    }
    submitPageView(payload, unique, perf, evokeCallback) {
        var _a;
        const privateData = {
            pid: this.projectID,
            perf,
            unique,
        };
        const pvPayload = {
            lc: getLocale(),
            tz: getTimezone(),
            ref: getReferrer(),
            so: getUTMSource(),
            me: getUTMMedium(),
            ca: getUTMCampaign(),
            te: getUTMTerm(),
            co: getUTMContent(),
            ...payload,
        };
        if (evokeCallback && ((_a = this.pageViewsOptions) === null || _a === void 0 ? void 0 : _a.callback)) {
            const callbackResult = this.pageViewsOptions.callback(pvPayload);
            if (callbackResult === false) {
                return;
            }
            if (callbackResult && typeof callbackResult === 'object') {
                Object.assign(pvPayload, callbackResult);
            }
        }
        Object.assign(pvPayload, privateData);
        this.sendRequest('', pvPayload);
    }
    canTrack() {
        var _a, _b, _c, _d;
        if (((_a = this.options) === null || _a === void 0 ? void 0 : _a.disabled) ||
            !isInBrowser() ||
            (((_b = this.options) === null || _b === void 0 ? void 0 : _b.respectDNT) && ((_c = window.navigator) === null || _c === void 0 ? void 0 : _c.doNotTrack) === '1') ||
            (!((_d = this.options) === null || _d === void 0 ? void 0 : _d.devMode) && isLocalhost()) ||
            isAutomated()) {
            return false;
        }
        return true;
    }
    async sendRequest(path, body) {
        var _a;
        const host = ((_a = this.options) === null || _a === void 0 ? void 0 : _a.apiURL) || DEFAULT_API_HOST;
        await fetch(`${host}/${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    }
}

let LIB_INSTANCE = null;
/**
 * Initialise the tracking library instance (other methods won't work if the library is not initialised).
 *
 * @param {string} pid The Project ID to link the instance of Swetrix.js to.
 * @param {LibOptions} options Options related to the tracking.
 * @returns {Lib} Instance of the Swetrix.js.
 */
function init(pid, options) {
    if (!LIB_INSTANCE) {
        LIB_INSTANCE = new Lib(pid, options);
    }
    return LIB_INSTANCE;
}
/**
 * With this function you are able to track any custom events you want.
 * You should never send any identifiable data (like User ID, email, session cookie, etc.) as an event name.
 * The total number of track calls and their conversion rate will be saved.
 *
 * @param {TrackEventOptions} event The options related to the custom event.
 */
async function track(event) {
    if (!LIB_INSTANCE)
        return;
    await LIB_INSTANCE.track(event);
}
/**
 * With this function you are able to automatically track pageviews across your application.
 *
 * @param {PageViewsOptions} options Pageviews tracking options.
 * @returns {PageActions} The actions related to the tracking. Used to stop tracking pages.
 */
function trackViews(options) {
    return new Promise((resolve) => {
        if (!LIB_INSTANCE) {
            resolve(defaultActions);
            return;
        }
        // We need to verify that document.readyState is complete for the performance stats to be collected correctly.
        if (typeof document === 'undefined' || document.readyState === 'complete') {
            resolve(LIB_INSTANCE.trackPageViews(options));
        }
        else {
            window.addEventListener('load', () => {
                // @ts-ignore
                resolve(LIB_INSTANCE.trackPageViews(options));
            });
        }
    });
}
/**
 * This function is used to set up automatic error events tracking.
 * It set's up an error listener, and whenever an error happens, it gets tracked.
 *
 * @returns {ErrorActions} The actions related to the tracking. Used to stop tracking errors.
 */
function trackErrors(options) {
    if (!LIB_INSTANCE) {
        return defaultActions;
    }
    return LIB_INSTANCE.trackErrors(options);
}
/**
 * This function is used to manually track an error event.
 * It's useful if you want to track specific errors in your application.
 *
 * @param payload Swetrix error object to send.
 * @returns void
 */
function trackError(payload) {
    if (!LIB_INSTANCE)
        return;
    LIB_INSTANCE.submitError(payload, false);
}
/**
 * This function is used to manually track a page view event.
 * It's useful if your application uses esoteric routing which is not supported by Swetrix by default.
 *
 * @deprecated This function is deprecated and will be removed soon, please use the `pageview` instead.
 * @param pg Path of the page to track (this will be sent to the Swetrix API and displayed in the dashboard).
 * @param _prev Path of the previous page (deprecated and ignored).
 * @param unique If set to `true`, only 1 event with the same ID will be saved per user session.
 * @returns void
 */
function trackPageview(pg, _prev, unique) {
    if (!LIB_INSTANCE)
        return;
    LIB_INSTANCE.submitPageView({ pg }, Boolean(unique), {});
}
function pageview(options) {
    if (!LIB_INSTANCE)
        return;
    LIB_INSTANCE.submitPageView(options.payload, Boolean(options.unique), {});
}

export { LIB_INSTANCE, init, pageview, track, trackError, trackErrors, trackPageview, trackViews };
//# sourceMappingURL=swetrix.es5.js.map
