(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.swetrix = {}));
})(this, (function (exports) { 'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    var findInSearch = function (exp) {
        var res = location.search.match(exp);
        return (res && res[2]) || undefined;
    };
    var utmSourceRegex = /[?&](ref|source|utm_source)=([^?&]+)/;
    var utmCampaignRegex = /[?&](utm_campaign)=([^?&]+)/;
    var utmMediumRegex = /[?&](utm_medium)=([^?&]+)/;
    var isInBrowser = function () {
        return typeof window !== 'undefined';
    };
    var isLocalhost = function () {
        return (location === null || location === void 0 ? void 0 : location.hostname) === 'localhost' || (location === null || location === void 0 ? void 0 : location.hostname) === '127.0.0.1' || (location === null || location === void 0 ? void 0 : location.hostname) === '';
    };
    var isAutomated = function () {
        return navigator === null || navigator === void 0 ? void 0 : navigator.webdriver;
    };
    var getLocale = function () {
        return typeof navigator.languages !== 'undefined' ? navigator.languages[0] : navigator.language;
    };
    var getTimezone = function () {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        catch (e) {
            return;
        }
    };
    var getReferrer = function () {
        return document.referrer || undefined;
    };
    var getUTMSource = function () { return findInSearch(utmSourceRegex); };
    var getUTMMedium = function () { return findInSearch(utmMediumRegex); };
    var getUTMCampaign = function () { return findInSearch(utmCampaignRegex); };
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
    var getPath = function (options) {
        var result = location.pathname || '';
        if (options.hash) {
            var hashIndex = location.hash.indexOf('?');
            var hashString = hashIndex > -1 ? location.hash.substring(0, hashIndex) : location.hash;
            result += hashString;
        }
        if (options.search) {
            var hashIndex = location.hash.indexOf('?');
            var searchString = location.search || (hashIndex > -1 ? location.hash.substring(hashIndex) : '');
            result += searchString;
        }
        return result;
    };

    var defaultActions = {
        stop: function () { },
    };
    var DEFAULT_API_HOST = 'https://api.swetrix.com/log';
    var Lib = /** @class */ (function () {
        function Lib(projectID, options) {
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
        Lib.prototype.captureError = function (event) {
            var _a, _b, _c;
            if (typeof ((_a = this.errorsOptions) === null || _a === void 0 ? void 0 : _a.sampleRate) === 'number' && this.errorsOptions.sampleRate > Math.random()) {
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
            });
        };
        Lib.prototype.trackErrors = function (options) {
            var _this = this;
            if (this.errorListenerExists || !this.canTrack()) {
                return defaultActions;
            }
            this.errorsOptions = options;
            window.addEventListener('error', this.captureError);
            this.errorListenerExists = true;
            return {
                stop: function () {
                    window.removeEventListener('error', _this.captureError);
                },
            };
        };
        Lib.prototype.submitError = function (payload, evokeCallback) {
            var _a, _b, _c;
            var privateData = {
                pid: this.projectID,
            };
            var errorPayload = __assign({ pg: this.activePage ||
                    getPath({
                        hash: (_a = this.pageViewsOptions) === null || _a === void 0 ? void 0 : _a.hash,
                        search: (_b = this.pageViewsOptions) === null || _b === void 0 ? void 0 : _b.search,
                    }), lc: getLocale(), tz: getTimezone() }, payload);
            if (evokeCallback && ((_c = this.errorsOptions) === null || _c === void 0 ? void 0 : _c.callback)) {
                var callbackResult = this.errorsOptions.callback(errorPayload);
                if (callbackResult === false) {
                    return;
                }
                if (callbackResult && typeof callbackResult === 'object') {
                    Object.assign(errorPayload, callbackResult);
                }
            }
            Object.assign(errorPayload, privateData);
            this.sendRequest('error', errorPayload);
        };
        Lib.prototype.track = function (event) {
            if (!this.canTrack()) {
                return;
            }
            var data = __assign(__assign({}, event), { pid: this.projectID, pg: this.activePage, lc: getLocale(), tz: getTimezone(), ref: getReferrer(), so: getUTMSource(), me: getUTMMedium(), ca: getUTMCampaign() });
            this.sendRequest('custom', data);
        };
        Lib.prototype.trackPageViews = function (options) {
            if (!this.canTrack()) {
                return defaultActions;
            }
            if (this.pageData) {
                return this.pageData.actions;
            }
            this.pageViewsOptions = options;
            var interval;
            if (!(options === null || options === void 0 ? void 0 : options.unique)) {
                interval = setInterval(this.trackPathChange, 2000);
            }
            setTimeout(this.heartbeat, 3000);
            var hbInterval = setInterval(this.heartbeat, 28000);
            var path = getPath({
                hash: options === null || options === void 0 ? void 0 : options.hash,
                search: options === null || options === void 0 ? void 0 : options.search,
            });
            this.pageData = {
                path: path,
                actions: {
                    stop: function () {
                        clearInterval(interval);
                        clearInterval(hbInterval);
                    },
                },
            };
            this.trackPage(path, options === null || options === void 0 ? void 0 : options.unique);
            return this.pageData.actions;
        };
        Lib.prototype.getPerformanceStats = function () {
            var _a;
            if (!this.canTrack() || this.perfStatsCollected || !((_a = window.performance) === null || _a === void 0 ? void 0 : _a.getEntriesByType)) {
                return {};
            }
            var perf = window.performance.getEntriesByType('navigation')[0];
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
        };
        Lib.prototype.heartbeat = function () {
            var _a;
            if (!((_a = this.pageViewsOptions) === null || _a === void 0 ? void 0 : _a.heartbeatOnBackground) && document.visibilityState === 'hidden') {
                return;
            }
            var data = {
                pid: this.projectID,
            };
            this.sendRequest('hb', data);
        };
        // Tracking path changes. If path changes -> calling this.trackPage method
        Lib.prototype.trackPathChange = function () {
            var _a, _b;
            if (!this.pageData)
                return;
            var newPath = getPath({
                hash: (_a = this.pageViewsOptions) === null || _a === void 0 ? void 0 : _a.hash,
                search: (_b = this.pageViewsOptions) === null || _b === void 0 ? void 0 : _b.search,
            });
            var path = this.pageData.path;
            if (path !== newPath) {
                this.trackPage(newPath, false);
            }
        };
        Lib.prototype.getPreviousPage = function () {
            // Assuming that this function is called in trackPage and this.activePage is not overwritten by new value yet
            // That method of getting previous page works for SPA websites
            if (this.activePage) {
                return this.activePage;
            }
            // Checking if URL is supported by the browser (for example, IE11 does not support it)
            if (typeof URL === 'function') {
                // That method of getting previous page works for websites with page reloads
                var referrer = getReferrer();
                if (!referrer) {
                    return null;
                }
                var host = location.host;
                try {
                    var url = new URL(referrer);
                    var refHost = url.host, pathname = url.pathname;
                    if (host !== refHost) {
                        return null;
                    }
                    return pathname;
                }
                catch (_a) {
                    return null;
                }
            }
            return null;
        };
        Lib.prototype.trackPage = function (pg, unique) {
            if (unique === void 0) { unique = false; }
            if (!this.pageData)
                return;
            this.pageData.path = pg;
            var perf = this.getPerformanceStats();
            var prev = this.getPreviousPage();
            this.activePage = pg;
            this.submitPageView(pg, prev, unique, perf, true);
        };
        Lib.prototype.submitPageView = function (pg, prev, unique, perf, evokeCallback) {
            var _a;
            var privateData = {
                pid: this.projectID,
                perf: perf,
                unique: unique,
            };
            var pvPayload = {
                lc: getLocale(),
                tz: getTimezone(),
                ref: getReferrer(),
                so: getUTMSource(),
                me: getUTMMedium(),
                ca: getUTMCampaign(),
                pg: pg,
                prev: prev,
            };
            if (evokeCallback && ((_a = this.pageViewsOptions) === null || _a === void 0 ? void 0 : _a.callback)) {
                var callbackResult = this.pageViewsOptions.callback(pvPayload);
                if (callbackResult === false) {
                    return;
                }
                if (callbackResult && typeof callbackResult === 'object') {
                    Object.assign(pvPayload, callbackResult);
                }
            }
            Object.assign(pvPayload, privateData);
            this.sendRequest('', pvPayload);
        };
        Lib.prototype.canTrack = function () {
            var _a, _b, _c, _d;
            if (((_a = this.options) === null || _a === void 0 ? void 0 : _a.disabled) ||
                !isInBrowser() ||
                (((_b = this.options) === null || _b === void 0 ? void 0 : _b.respectDNT) && ((_c = window.navigator) === null || _c === void 0 ? void 0 : _c.doNotTrack) === '1') ||
                (!((_d = this.options) === null || _d === void 0 ? void 0 : _d.devMode) && isLocalhost()) ||
                isAutomated()) {
                return false;
            }
            return true;
        };
        Lib.prototype.sendRequest = function (path, body) {
            var _a;
            var host = ((_a = this.options) === null || _a === void 0 ? void 0 : _a.apiURL) || DEFAULT_API_HOST;
            var req = new XMLHttpRequest();
            req.open('POST', "".concat(host, "/").concat(path), true);
            req.setRequestHeader('Content-Type', 'application/json');
            req.send(JSON.stringify(body));
        };
        return Lib;
    }());

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
    function track(event) {
        if (!exports.LIB_INSTANCE)
            return;
        exports.LIB_INSTANCE.track(event);
    }
    /**
     * With this function you are able to automatically track pageviews across your application.
     *
     * @param {PageViewsOptions} options Pageviews tracking options.
     * @returns {PageActions} The actions related to the tracking. Used to stop tracking pages.
     */
    function trackViews(options) {
        return new Promise(function (resolve) {
            if (!exports.LIB_INSTANCE) {
                resolve(defaultActions);
                return;
            }
            // We need to verify that document.readyState is complete for the performance stats to be collected correctly.
            if (typeof document === 'undefined' || document.readyState === 'complete') {
                resolve(exports.LIB_INSTANCE.trackPageViews(options));
            }
            else {
                window.addEventListener('load', function () {
                    // @ts-ignore
                    resolve(exports.LIB_INSTANCE.trackPageViews(options));
                });
            }
        });
    }
    /**
     * With this function you are able to track any custom events you want.
     * You should never send any identifiable data (like User ID, email, session cookie, etc.) as an event name.
     * The total number of track calls and their conversion rate will be saved.
     *
     * @param {PageViewsOptions} options The options related to the custom event.
     * @returns {PageActions} The actions related to the tracking. Used to stop tracking pages.
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
     * @param path Path of the page to track (this will be sent to the Swetrix API and displayed in the dashboard).
     * @param prev Path of the previous page.
     * @param unique If set to `true`, only 1 event with the same ID will be saved per user session.
     * @returns void
     */
    function trackPageview(path, prev, unique) {
        if (!exports.LIB_INSTANCE)
            return;
        exports.LIB_INSTANCE.submitPageView(path, prev || null, Boolean(unique), {});
    }

    exports.init = init;
    exports.track = track;
    exports.trackError = trackError;
    exports.trackErrors = trackErrors;
    exports.trackPageview = trackPageview;
    exports.trackViews = trackViews;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
