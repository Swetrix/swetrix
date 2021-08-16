(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.swetrix = {}));
}(this, (function (exports) { 'use strict';

    /*! *****************************************************************************
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
    var getPath = function () {
        // TODO: Maybe we should also include such data as location.hash or location.search
        return location.pathname || '';
    };

    var host = 'https://api.swetrix.com/log';
    var Lib = /** @class */ (function () {
        function Lib(projectID, options) {
            this.projectID = projectID;
            this.options = options;
            this.pageData = null;
        }
        // Tracks a custom event
        Lib.prototype.track = function (event) {
            if (!this.canTrack()) {
                return;
            }
            var data = __assign({ pid: this.projectID }, event);
            this.submitCustom(data);
        };
        // Tracks page views
        Lib.prototype.trackPageViews = function (options) {
            if (!this.canTrack()) {
                return;
            }
            if (this.pageData) {
                return this.pageData.actions;
            }
            var interval = setInterval(this.trackPathChange, 1000);
            var path = getPath();
            this.pageData = {
                path: path,
                actions: {
                    stop: function () { return clearInterval(interval); }
                }
            };
            this.trackPage(path);
        };
        // Tracking path changes. If path changes -> calling this.trackPage method
        Lib.prototype.trackPathChange = function () {
            if (!this.pageData)
                return;
            var newPath = getPath();
            var path = this.pageData.path;
            if (path !== newPath) {
                this.trackPage(newPath);
            }
        };
        Lib.prototype.trackPage = function (pg) {
            if (!this.pageData)
                return;
            this.pageData.path = pg;
            var data = {
                pid: this.projectID,
                lc: getLocale(),
                tz: getTimezone(),
                ref: getReferrer(),
                so: getUTMSource(),
                me: getUTMMedium(),
                ca: getUTMCampaign(),
                pg: pg,
            };
            this.submitData(data);
        };
        Lib.prototype.debug = function (message) {
            var _a;
            if ((_a = this.options) === null || _a === void 0 ? void 0 : _a.debug) {
                console.log('[Swetrix]', message);
            }
        };
        Lib.prototype.canTrack = function () {
            var _a, _b, _c;
            if (!isInBrowser()) {
                this.debug('Tracking disabled: script does not run in browser environment.');
                return false;
            }
            if (((_a = this.options) === null || _a === void 0 ? void 0 : _a.respectDNT) && ((_b = window.navigator) === null || _b === void 0 ? void 0 : _b.doNotTrack) === '1') {
                this.debug('Tracking disabled: respecting user\'s \'Do Not Track\' preference.');
                return false;
            }
            if (!((_c = this.options) === null || _c === void 0 ? void 0 : _c.debug) && isLocalhost()) {
                return false;
            }
            if (isAutomated()) {
                this.debug('Tracking disabled: navigation is automated by WebDriver.');
                return false;
            }
            return true;
        };
        Lib.prototype.submitData = function (body) {
            return fetch(host, {
                method: 'post',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
        };
        Lib.prototype.submitCustom = function (body) {
            return fetch(host + "/custom", {
                method: 'post',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
        };
        return Lib;
    }());

    exports.LIB_INSTANCE = null;
    // Initialise the tracking library instance (other methods won't work if the library
    // is not initialised)
    function init(pid, options) {
        if (!exports.LIB_INSTANCE) {
            exports.LIB_INSTANCE = new Lib(pid, options);
        }
        return exports.LIB_INSTANCE;
    }
    // Tracks custom events
    function track(event) {
        if (!exports.LIB_INSTANCE)
            return;
        exports.LIB_INSTANCE.track(event);
    }
    function trackViews(options) {
        if (!exports.LIB_INSTANCE)
            return;
        exports.LIB_INSTANCE.trackPageViews(options);
    }

    exports.init = init;
    exports.track = track;
    exports.trackViews = trackViews;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
