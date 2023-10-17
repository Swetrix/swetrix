import { Lib, LibOptions, TrackEventOptions, PageViewsOptions, PageActions } from './Lib';
export declare let LIB_INSTANCE: Lib | null;
/**
 * Initialise the tracking library instance (other methods won't work if the library is not initialised).
 *
 * @param {string} pid The Project ID to link the instance of Swetrix.js to.
 * @param {LibOptions} options Options related to the tracking.
 * @returns {Lib} Instance of the Swetrix.js.
 */
export declare function init(pid: string, options?: LibOptions): Lib;
/**
 * With this function you are able to track any custom events you want.
 * You should never send any identifiable data (like User ID, email, session cookie, etc.) as an event name.
 * The total number of track calls and their conversion rate will be saved.
 *
 * @param {TrackEventOptions} event The options related to the custom event.
 */
export declare function track(event: TrackEventOptions): void;
/**
 * With this function you are able to track any custom events you want.
 * You should never send any identifiable data (like User ID, email, session cookie, etc.) as an event name.
 * The total number of track calls and their conversion rate will be saved.
 *
 * @param {PageViewsOptions} options The options related to the custom event.
 * @returns {PageActions} The actions related to the tracking. Used to stop tracking pages.
 */
export declare function trackViews(options?: PageViewsOptions): Promise<PageActions>;
/**
 * This function is used to manually track a page view event.
 * It's useful if your application uses esoteric routing which is not supported by Swetrix by default.
 *
 * @param path Path of the page to track (this will be sent to the Swetrix API and displayed in the dashboard).
 * @param prev Path of the previous page.
 * @param unique If set to `true`, only 1 event with the same ID will be saved per user session.
 * @returns void
 */
export declare function trackPageview(path: string, prev?: string, unique?: boolean): void;
