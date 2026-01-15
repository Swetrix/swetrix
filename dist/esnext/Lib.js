import { isInBrowser, isLocalhost, isAutomated, getLocale, getTimezone, getReferrer, getUTMCampaign, getUTMMedium, getUTMSource, getUTMTerm, getUTMContent, getPath, } from './utils.js';
export const defaultActions = {
    stop() { },
};
const DEFAULT_API_HOST = 'https://api.swetrix.com/log';
const DEFAULT_API_BASE = 'https://api.swetrix.com';
// Default cache duration: 5 minutes
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000;
export class Lib {
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
        if (typeof this.errorsOptions?.sampleRate === 'number' && this.errorsOptions.sampleRate >= Math.random()) {
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
            name: event.error?.name || 'Error',
            // Description of the error. By default, we use message from Error object, is it does not contain the error name
            // (we want to split error name and message so we could group them together later in dashboard).
            // If message in error object does not exist - lets use a message from the Error event itself.
            message: event.error?.message || event.message,
            // Stack trace of the error, if available.
            stackTrace: event.error?.stack,
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
        const privateData = {
            pid: this.projectID,
        };
        const errorPayload = {
            pg: this.activePage ||
                getPath({
                    hash: this.pageViewsOptions?.hash,
                    search: this.pageViewsOptions?.search,
                }),
            lc: getLocale(),
            tz: getTimezone(),
            ...payload,
        };
        if (evokeCallback && this.errorsOptions?.callback) {
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
        if (!this.canTrack()) {
            return;
        }
        const data = {
            ...event,
            pid: this.projectID,
            pg: this.activePage ||
                getPath({
                    hash: this.pageViewsOptions?.hash,
                    search: this.pageViewsOptions?.search,
                }),
            lc: getLocale(),
            tz: getTimezone(),
            ref: getReferrer(),
            so: getUTMSource(),
            me: getUTMMedium(),
            ca: getUTMCampaign(),
            te: getUTMTerm(),
            co: getUTMContent(),
            profileId: event.profileId ?? this.options?.profileId,
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
        if (!options?.unique) {
            interval = setInterval(this.trackPathChange, 2000);
        }
        setTimeout(this.heartbeat, 3000);
        const hbInterval = setInterval(this.heartbeat, 28000);
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
        if (!isInBrowser()) {
            return {};
        }
        const requestedProfileId = options?.profileId ?? this.options?.profileId;
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
            return this.cachedData?.flags || {};
        }
        catch (error) {
            console.warn('[Swetrix] Error fetching feature flags:', error);
            return this.cachedData?.flags || {};
        }
    }
    /**
     * Internal method to fetch both feature flags and experiments from the API.
     */
    async fetchFlagsAndExperiments(options) {
        const apiBase = this.getApiBase();
        const body = {
            pid: this.projectID,
        };
        // Use profileId from options, or fall back to global profileId
        const profileId = options?.profileId ?? this.options?.profileId;
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
        const cachedProfileId = options?.profileId ?? this.options?.profileId;
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
        const flags = await this.getFeatureFlags(options);
        return flags[key] ?? defaultValue;
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
        if (!isInBrowser()) {
            return {};
        }
        const requestedProfileId = options?.profileId ?? this.options?.profileId;
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
            return this.cachedData?.experiments || {};
        }
        catch (error) {
            console.warn('[Swetrix] Error fetching experiments:', error);
            return this.cachedData?.experiments || {};
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
        const experiments = await this.getExperiments(options);
        return experiments[experimentId] ?? defaultVariant;
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
        // If profileId is already set in options, return it
        if (this.options?.profileId) {
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
        catch {
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
        catch {
            return null;
        }
    }
    /**
     * Gets the API base URL (without /log suffix).
     */
    getApiBase() {
        if (this.options?.apiURL) {
            // Remove trailing /log if present
            return this.options.apiURL.replace(/\/log\/?$/, '');
        }
        return DEFAULT_API_BASE;
    }
    heartbeat() {
        if (!this.pageViewsOptions?.heartbeatOnBackground && document.visibilityState === 'hidden') {
            return;
        }
        const data = {
            pid: this.projectID,
        };
        if (this.options?.profileId) {
            data.profileId = this.options.profileId;
        }
        this.sendRequest('hb', data);
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
    trackPage(pg, unique = false) {
        if (!this.pageData)
            return;
        this.pageData.path = pg;
        const perf = this.getPerformanceStats();
        this.activePage = pg;
        this.submitPageView({ pg }, unique, perf, true);
    }
    submitPageView(payload, unique, perf, evokeCallback) {
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
            profileId: this.options?.profileId,
            ...payload,
        };
        if (evokeCallback && this.pageViewsOptions?.callback) {
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
        if (this.options?.disabled ||
            !isInBrowser() ||
            (this.options?.respectDNT && window.navigator?.doNotTrack === '1') ||
            (!this.options?.devMode && isLocalhost()) ||
            isAutomated()) {
            return false;
        }
        return true;
    }
    async sendRequest(path, body) {
        const host = this.options?.apiURL || DEFAULT_API_HOST;
        await fetch(`${host}/${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    }
}
//# sourceMappingURL=Lib.js.map