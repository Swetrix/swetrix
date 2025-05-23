'use strict';

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
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


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

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

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
var utmTermRegex = /[?&](utm_term)=([^?&]+)/;
var utmContentRegex = /[?&](utm_content)=([^?&]+)/;
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
var getUTMTerm = function () { return findInSearch(utmTermRegex); };
var getUTMContent = function () { return findInSearch(utmContentRegex); };
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
        var _a, _b, _c, _d;
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
            // Stack trace of the error, if available.
            stackTrace: (_d = event.error) === null || _d === void 0 ? void 0 : _d.stack,
        }, true);
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
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.canTrack()) {
                            return [2 /*return*/];
                        }
                        data = __assign(__assign({}, event), { pid: this.projectID, pg: this.activePage, lc: getLocale(), tz: getTimezone(), ref: getReferrer(), so: getUTMSource(), me: getUTMMedium(), ca: getUTMCampaign(), te: getUTMTerm(), co: getUTMContent() });
                        return [4 /*yield*/, this.sendRequest('custom', data)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
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
    Lib.prototype.trackPage = function (pg, unique) {
        if (unique === void 0) { unique = false; }
        if (!this.pageData)
            return;
        this.pageData.path = pg;
        var perf = this.getPerformanceStats();
        this.activePage = pg;
        this.submitPageView({ pg: pg }, unique, perf, true);
    };
    Lib.prototype.submitPageView = function (payload, unique, perf, evokeCallback) {
        var _a;
        var privateData = {
            pid: this.projectID,
            perf: perf,
            unique: unique,
        };
        var pvPayload = __assign({ lc: getLocale(), tz: getTimezone(), ref: getReferrer(), so: getUTMSource(), me: getUTMMedium(), ca: getUTMCampaign(), te: getUTMTerm(), co: getUTMContent() }, payload);
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
        return __awaiter(this, void 0, void 0, function () {
            var host;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        host = ((_a = this.options) === null || _a === void 0 ? void 0 : _a.apiURL) || DEFAULT_API_HOST;
                        return [4 /*yield*/, fetch("".concat(host, "/").concat(path), {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(body),
                            })];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
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
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!exports.LIB_INSTANCE)
                        return [2 /*return*/];
                    return [4 /*yield*/, exports.LIB_INSTANCE.track(event)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
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
    exports.LIB_INSTANCE.submitPageView({ pg: pg }, Boolean(unique), {});
}
function pageview(options) {
    if (!exports.LIB_INSTANCE)
        return;
    exports.LIB_INSTANCE.submitPageView(options.payload, Boolean(options.unique), {});
}

exports.init = init;
exports.pageview = pageview;
exports.track = track;
exports.trackError = trackError;
exports.trackErrors = trackErrors;
exports.trackPageview = trackPageview;
exports.trackViews = trackViews;
//# sourceMappingURL=swetrix.cjs.js.map
