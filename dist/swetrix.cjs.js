'use strict';

const findInSearch = (exp) => {
    const res = location.search.match(exp);
    return (res && res[2]) || undefined;
};
const utmSourceRegex = /[?&](ref|source|utm_source|gad_source)=([^?&]+)/;
const utmCampaignRegex = /[?&](utm_campaign|gad_campaignid)=([^?&]+)/;
const utmMediumRegex = /[?&](utm_medium)=([^?&]+)/;
const utmTermRegex = /[?&](utm_term)=([^?&]+)/;
const utmContentRegex = /[?&](utm_content)=([^?&]+)/;
const gclidRegex = /[?&](gclid)=([^?&]+)/;
const getGclid = () => {
    return findInSearch(gclidRegex) ? '<gclid>' : undefined;
};
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
const getUTMMedium = () => findInSearch(utmMediumRegex) || getGclid();
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
const DEFAULT_API_BASE = 'https://api.swetrix.com';
// Default cache duration: 5 minutes
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000;
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
        this.cachedData = null;
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
        var _a, _b, _c, _d;
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
            profileId: (_c = event.profileId) !== null && _c !== void 0 ? _c : (_d = this.options) === null || _d === void 0 ? void 0 : _d.profileId,
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
    /**
     * Fetches all feature flags and experiments for the project.
     * Results are cached for 5 minutes by default.
     *
     * @param options - Options for evaluating feature flags.
     * @param forceRefresh - If true, bypasses the cache and fetches fresh data.
     * @returns A promise that resolves to a record of flag keys to boolean values.
     */
    async getFeatureFlags(options, forceRefresh) {
        var _a, _b, _c, _d;
        if (!isInBrowser()) {
            return {};
        }
        const requestedProfileId = (_a = options === null || options === void 0 ? void 0 : options.profileId) !== null && _a !== void 0 ? _a : (_b = this.options) === null || _b === void 0 ? void 0 : _b.profileId;
        // Check cache first - must match profileId and not be expired
        if (!forceRefresh && this.cachedData) {
            const now = Date.now();
            const isSameProfile = this.cachedData.profileId === requestedProfileId;
            if (isSameProfile && now - this.cachedData.timestamp < DEFAULT_CACHE_DURATION) {
                return this.cachedData.flags;
            }
        }
        try {
            await this.fetchFlagsAndExperiments(options);
            return ((_c = this.cachedData) === null || _c === void 0 ? void 0 : _c.flags) || {};
        }
        catch (error) {
            console.warn('[Swetrix] Error fetching feature flags:', error);
            return ((_d = this.cachedData) === null || _d === void 0 ? void 0 : _d.flags) || {};
        }
    }
    /**
     * Internal method to fetch both feature flags and experiments from the API.
     */
    async fetchFlagsAndExperiments(options) {
        var _a, _b, _c, _d;
        const apiBase = this.getApiBase();
        const body = {
            pid: this.projectID,
        };
        // Use profileId from options, or fall back to global profileId
        const profileId = (_a = options === null || options === void 0 ? void 0 : options.profileId) !== null && _a !== void 0 ? _a : (_b = this.options) === null || _b === void 0 ? void 0 : _b.profileId;
        if (profileId) {
            body.profileId = profileId;
        }
        const response = await fetch(`${apiBase}/feature-flag/evaluate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            console.warn('[Swetrix] Failed to fetch feature flags and experiments:', response.status);
            return;
        }
        const data = (await response.json());
        // Use profileId from options, or fall back to global profileId
        const cachedProfileId = (_c = options === null || options === void 0 ? void 0 : options.profileId) !== null && _c !== void 0 ? _c : (_d = this.options) === null || _d === void 0 ? void 0 : _d.profileId;
        // Update cache with both flags and experiments
        this.cachedData = {
            flags: data.flags || {},
            experiments: data.experiments || {},
            timestamp: Date.now(),
            profileId: cachedProfileId,
        };
    }
    /**
     * Gets the value of a single feature flag.
     *
     * @param key - The feature flag key.
     * @param options - Options for evaluating the feature flag.
     * @param defaultValue - Default value to return if the flag is not found. Defaults to false.
     * @returns A promise that resolves to the boolean value of the flag.
     */
    async getFeatureFlag(key, options, defaultValue = false) {
        var _a;
        const flags = await this.getFeatureFlags(options);
        return (_a = flags[key]) !== null && _a !== void 0 ? _a : defaultValue;
    }
    /**
     * Clears the cached feature flags and experiments, forcing a fresh fetch on the next call.
     */
    clearFeatureFlagsCache() {
        this.cachedData = null;
    }
    /**
     * Fetches all A/B test experiments for the project.
     * Results are cached for 5 minutes by default (shared cache with feature flags).
     *
     * @param options - Options for evaluating experiments.
     * @param forceRefresh - If true, bypasses the cache and fetches fresh data.
     * @returns A promise that resolves to a record of experiment IDs to variant keys.
     *
     * @example
     * ```typescript
     * const experiments = await getExperiments()
     * // experiments = { 'exp-123': 'variant-a', 'exp-456': 'control' }
     * ```
     */
    async getExperiments(options, forceRefresh) {
        var _a, _b, _c, _d;
        if (!isInBrowser()) {
            return {};
        }
        const requestedProfileId = (_a = options === null || options === void 0 ? void 0 : options.profileId) !== null && _a !== void 0 ? _a : (_b = this.options) === null || _b === void 0 ? void 0 : _b.profileId;
        // Check cache first - must match profileId and not be expired
        if (!forceRefresh && this.cachedData) {
            const now = Date.now();
            const isSameProfile = this.cachedData.profileId === requestedProfileId;
            if (isSameProfile && now - this.cachedData.timestamp < DEFAULT_CACHE_DURATION) {
                return this.cachedData.experiments;
            }
        }
        try {
            await this.fetchFlagsAndExperiments(options);
            return ((_c = this.cachedData) === null || _c === void 0 ? void 0 : _c.experiments) || {};
        }
        catch (error) {
            console.warn('[Swetrix] Error fetching experiments:', error);
            return ((_d = this.cachedData) === null || _d === void 0 ? void 0 : _d.experiments) || {};
        }
    }
    /**
     * Gets the variant key for a specific A/B test experiment.
     *
     * @param experimentId - The experiment ID.
     * @param options - Options for evaluating the experiment.
     * @param defaultVariant - Default variant key to return if the experiment is not found. Defaults to null.
     * @returns A promise that resolves to the variant key assigned to this user, or defaultVariant if not found.
     *
     * @example
     * ```typescript
     * const variant = await getExperiment('checkout-redesign')
     *
     * if (variant === 'new-checkout') {
     *   // Show new checkout flow
     * } else {
     *   // Show control (original) checkout
     * }
     * ```
     */
    async getExperiment(experimentId, options, defaultVariant = null) {
        var _a;
        const experiments = await this.getExperiments(options);
        return (_a = experiments[experimentId]) !== null && _a !== void 0 ? _a : defaultVariant;
    }
    /**
     * Clears the cached experiments (alias for clearFeatureFlagsCache since they share the same cache).
     */
    clearExperimentsCache() {
        this.cachedData = null;
    }
    /**
     * Gets the anonymous profile ID for the current visitor.
     * If profileId was set via init options, returns that.
     * Otherwise, requests server to generate one from IP/UA hash.
     *
     * This ID can be used for revenue attribution with payment providers.
     *
     * @returns A promise that resolves to the profile ID string, or null on error.
     *
     * @example
     * ```typescript
     * const profileId = await swetrix.getProfileId()
     *
     * // Pass to Paddle Checkout for revenue attribution
     * Paddle.Checkout.open({
     *   items: [{ priceId: 'pri_01234567890', quantity: 1 }],
     *   customData: {
     *     swetrix_profile_id: profileId,
     *     swetrix_session_id: await swetrix.getSessionId()
     *   }
     * })
     * ```
     */
    async getProfileId() {
        var _a;
        // If profileId is already set in options, return it
        if ((_a = this.options) === null || _a === void 0 ? void 0 : _a.profileId) {
            return this.options.profileId;
        }
        if (!isInBrowser()) {
            return null;
        }
        try {
            const apiBase = this.getApiBase();
            const response = await fetch(`${apiBase}/log/profile-id`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pid: this.projectID }),
            });
            if (!response.ok) {
                return null;
            }
            const data = (await response.json());
            return data.profileId;
        }
        catch (_b) {
            return null;
        }
    }
    /**
     * Gets the current session ID for the visitor.
     * Session IDs are generated server-side based on IP and user agent.
     *
     * This ID can be used for revenue attribution with payment providers.
     *
     * @returns A promise that resolves to the session ID string, or null on error.
     *
     * @example
     * ```typescript
     * const sessionId = await swetrix.getSessionId()
     *
     * // Pass to Paddle Checkout for revenue attribution
     * Paddle.Checkout.open({
     *   items: [{ priceId: 'pri_01234567890', quantity: 1 }],
     *   customData: {
     *     swetrix_profile_id: await swetrix.getProfileId(),
     *     swetrix_session_id: sessionId
     *   }
     * })
     * ```
     */
    async getSessionId() {
        if (!isInBrowser()) {
            return null;
        }
        try {
            const apiBase = this.getApiBase();
            const response = await fetch(`${apiBase}/log/session-id`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pid: this.projectID }),
            });
            if (!response.ok) {
                return null;
            }
            const data = (await response.json());
            return data.sessionId;
        }
        catch (_a) {
            return null;
        }
    }
    /**
     * Gets the API base URL (without /log suffix).
     */
    getApiBase() {
        var _a;
        if ((_a = this.options) === null || _a === void 0 ? void 0 : _a.apiURL) {
            // Remove trailing /log if present
            return this.options.apiURL.replace(/\/log\/?$/, '');
        }
        return DEFAULT_API_BASE;
    }
    heartbeat() {
        var _a, _b;
        if (!((_a = this.pageViewsOptions) === null || _a === void 0 ? void 0 : _a.heartbeatOnBackground) && document.visibilityState === 'hidden') {
            return;
        }
        const data = {
            pid: this.projectID,
        };
        if ((_b = this.options) === null || _b === void 0 ? void 0 : _b.profileId) {
            data.profileId = this.options.profileId;
        }
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
        var _a, _b;
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
            profileId: (_a = this.options) === null || _a === void 0 ? void 0 : _a.profileId,
            ...payload,
        };
        if (evokeCallback && ((_b = this.pageViewsOptions) === null || _b === void 0 ? void 0 : _b.callback)) {
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

exports.LIB_INSTANCE = null;
/**
 * Initialise the tracking library instance (other methods won't work if the library is not initialised).
 *
 * @param {string} pid The Project ID to link the instance of Swetrix.js to.
 * @param {LibOptions} options Options related to the tracking.
 * @returns {Lib} Instance of the Swetrix.js.
 */
function init(pid, options) {
    if (!exports.LIB_INSTANCE) {
        exports.LIB_INSTANCE = new Lib(pid, options);
    }
    return exports.LIB_INSTANCE;
}
/**
 * With this function you are able to track any custom events you want.
 * You should never send any identifiable data (like User ID, email, session cookie, etc.) as an event name.
 * The total number of track calls and their conversion rate will be saved.
 *
 * @param {TrackEventOptions} event The options related to the custom event.
 */
async function track(event) {
    if (!exports.LIB_INSTANCE)
        return;
    await exports.LIB_INSTANCE.track(event);
}
/**
 * With this function you are able to automatically track pageviews across your application.
 *
 * @param {PageViewsOptions} options Pageviews tracking options.
 * @returns {PageActions} The actions related to the tracking. Used to stop tracking pages.
 */
function trackViews(options) {
    return new Promise((resolve) => {
        if (!exports.LIB_INSTANCE) {
            resolve(defaultActions);
            return;
        }
        // We need to verify that document.readyState is complete for the performance stats to be collected correctly.
        if (typeof document === 'undefined' || document.readyState === 'complete') {
            resolve(exports.LIB_INSTANCE.trackPageViews(options));
        }
        else {
            window.addEventListener('load', () => {
                // @ts-ignore
                resolve(exports.LIB_INSTANCE.trackPageViews(options));
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
    if (!exports.LIB_INSTANCE) {
        return defaultActions;
    }
    return exports.LIB_INSTANCE.trackErrors(options);
}
/**
 * This function is used to manually track an error event.
 * It's useful if you want to track specific errors in your application.
 *
 * @param payload Swetrix error object to send.
 * @returns void
 */
function trackError(payload) {
    if (!exports.LIB_INSTANCE)
        return;
    exports.LIB_INSTANCE.submitError(payload, false);
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
    if (!exports.LIB_INSTANCE)
        return;
    exports.LIB_INSTANCE.submitPageView({ pg }, Boolean(unique), {});
}
function pageview(options) {
    if (!exports.LIB_INSTANCE)
        return;
    exports.LIB_INSTANCE.submitPageView(options.payload, Boolean(options.unique), {});
}
/**
 * Fetches all feature flags for the project.
 * Results are cached for 5 minutes by default.
 *
 * @param options - Options for evaluating feature flags (visitorId, attributes).
 * @param forceRefresh - If true, bypasses the cache and fetches fresh flags.
 * @returns A promise that resolves to a record of flag keys to boolean values.
 *
 * @example
 * ```typescript
 * const flags = await getFeatureFlags({
 *   visitorId: 'user-123',
 *   attributes: { cc: 'US', dv: 'desktop' }
 * })
 *
 * if (flags['new-checkout']) {
 *   // Show new checkout flow
 * }
 * ```
 */
async function getFeatureFlags(options, forceRefresh) {
    if (!exports.LIB_INSTANCE)
        return {};
    return exports.LIB_INSTANCE.getFeatureFlags(options, forceRefresh);
}
/**
 * Gets the value of a single feature flag.
 *
 * @param key - The feature flag key.
 * @param options - Options for evaluating the feature flag (visitorId, attributes).
 * @param defaultValue - Default value to return if the flag is not found. Defaults to false.
 * @returns A promise that resolves to the boolean value of the flag.
 *
 * @example
 * ```typescript
 * const isEnabled = await getFeatureFlag('dark-mode', { visitorId: 'user-123' })
 *
 * if (isEnabled) {
 *   // Enable dark mode
 * }
 * ```
 */
async function getFeatureFlag(key, options, defaultValue = false) {
    if (!exports.LIB_INSTANCE)
        return defaultValue;
    return exports.LIB_INSTANCE.getFeatureFlag(key, options, defaultValue);
}
/**
 * Clears the cached feature flags, forcing a fresh fetch on the next call.
 * Useful when you know the user's context has changed significantly.
 */
function clearFeatureFlagsCache() {
    if (!exports.LIB_INSTANCE)
        return;
    exports.LIB_INSTANCE.clearFeatureFlagsCache();
}
/**
 * Fetches all A/B test experiments for the project.
 * Results are cached for 5 minutes by default (shared cache with feature flags).
 *
 * @param options - Options for evaluating experiments.
 * @param forceRefresh - If true, bypasses the cache and fetches fresh data.
 * @returns A promise that resolves to a record of experiment IDs to variant keys.
 *
 * @example
 * ```typescript
 * const experiments = await getExperiments()
 * // experiments = { 'exp-123': 'variant-a', 'exp-456': 'control' }
 *
 * // Use the assigned variant
 * const checkoutVariant = experiments['checkout-experiment-id']
 * if (checkoutVariant === 'new-checkout') {
 *   showNewCheckout()
 * } else {
 *   showOriginalCheckout()
 * }
 * ```
 */
async function getExperiments(options, forceRefresh) {
    if (!exports.LIB_INSTANCE)
        return {};
    return exports.LIB_INSTANCE.getExperiments(options, forceRefresh);
}
/**
 * Gets the variant key for a specific A/B test experiment.
 *
 * @param experimentId - The experiment ID.
 * @param options - Options for evaluating the experiment.
 * @param defaultVariant - Default variant key to return if the experiment is not found. Defaults to null.
 * @returns A promise that resolves to the variant key assigned to this user, or defaultVariant if not found.
 *
 * @example
 * ```typescript
 * const variant = await getExperiment('checkout-redesign-experiment-id')
 *
 * if (variant === 'new-checkout') {
 *   // Show new checkout flow
 *   showNewCheckout()
 * } else if (variant === 'control') {
 *   // Show original checkout (control group)
 *   showOriginalCheckout()
 * } else {
 *   // Experiment not running or user not included
 *   showOriginalCheckout()
 * }
 * ```
 */
async function getExperiment(experimentId, options, defaultVariant = null) {
    if (!exports.LIB_INSTANCE)
        return defaultVariant;
    return exports.LIB_INSTANCE.getExperiment(experimentId, options, defaultVariant);
}
/**
 * Clears the cached experiments, forcing a fresh fetch on the next call.
 * This is an alias for clearFeatureFlagsCache since experiments and flags share the same cache.
 */
function clearExperimentsCache() {
    if (!exports.LIB_INSTANCE)
        return;
    exports.LIB_INSTANCE.clearExperimentsCache();
}
/**
 * Gets the anonymous profile ID for the current visitor.
 * If profileId was set via init options, returns that.
 * Otherwise, requests server to generate one from IP/UA hash.
 *
 * This ID can be used for revenue attribution with payment providers like Paddle.
 *
 * @returns A promise that resolves to the profile ID string, or null on error.
 *
 * @example
 * ```typescript
 * const profileId = await getProfileId()
 *
 * // Pass to Paddle Checkout for revenue attribution
 * Paddle.Checkout.open({
 *   items: [{ priceId: 'pri_01234567890', quantity: 1 }],
 *   customData: {
 *     swetrix_profile_id: profileId,
 *     swetrix_session_id: await getSessionId()
 *   }
 * })
 * ```
 */
async function getProfileId() {
    if (!exports.LIB_INSTANCE)
        return null;
    return exports.LIB_INSTANCE.getProfileId();
}
/**
 * Gets the current session ID for the visitor.
 * Session IDs are generated server-side based on IP and user agent.
 *
 * This ID can be used for revenue attribution with payment providers like Paddle.
 *
 * @returns A promise that resolves to the session ID string, or null on error.
 *
 * @example
 * ```typescript
 * const sessionId = await getSessionId()
 *
 * // Pass to Paddle Checkout for revenue attribution
 * Paddle.Checkout.open({
 *   items: [{ priceId: 'pri_01234567890', quantity: 1 }],
 *   customData: {
 *     swetrix_profile_id: await getProfileId(),
 *     swetrix_session_id: sessionId
 *   }
 * })
 * ```
 */
async function getSessionId() {
    if (!exports.LIB_INSTANCE)
        return null;
    return exports.LIB_INSTANCE.getSessionId();
}

exports.clearExperimentsCache = clearExperimentsCache;
exports.clearFeatureFlagsCache = clearFeatureFlagsCache;
exports.getExperiment = getExperiment;
exports.getExperiments = getExperiments;
exports.getFeatureFlag = getFeatureFlag;
exports.getFeatureFlags = getFeatureFlags;
exports.getProfileId = getProfileId;
exports.getSessionId = getSessionId;
exports.init = init;
exports.pageview = pageview;
exports.track = track;
exports.trackError = trackError;
exports.trackErrors = trackErrors;
exports.trackPageview = trackPageview;
exports.trackViews = trackViews;
//# sourceMappingURL=swetrix.cjs.js.map
