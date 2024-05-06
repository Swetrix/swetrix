export interface LibOptions {
    /**
     * When set to `true`, localhost events will be sent to server.
     */
    devMode?: boolean;
    /**
     * When set to `true`, the tracking library won't send any data to server.
     * Useful for development purposes when this value is set based on `.env` var.
     */
    disabled?: boolean;
    /**
     * By setting this flag to `true`, we will not collect ANY kind of data about the user with the DNT setting.
     */
    respectDNT?: boolean;
    /** Set a custom URL of the API server (for selfhosted variants of Swetrix). */
    apiURL?: string;
}
export interface TrackEventOptions {
    /** The custom event name. */
    ev: string;
    /** If set to `true`, only 1 event with the same ID will be saved per user session. */
    unique?: boolean;
    /** Event-related metadata object with string values. */
    meta?: {
        [key: string]: string;
    };
}
export interface IPageViewPayload {
    lc: string | undefined;
    tz: string | undefined;
    ref: string | undefined;
    so: string | undefined;
    me: string | undefined;
    ca: string | undefined;
    pg: string | null | undefined;
    prev: string | null | undefined;
}
export interface IErrorEventPayload {
    name: string;
    message: string | null | undefined;
    lineno: number | null | undefined;
    colno: number | null | undefined;
    filename: string | null | undefined;
}
export interface IInternalErrorEventPayload extends IErrorEventPayload {
    lc: string | undefined;
    tz: string | undefined;
    pg: string | null | undefined;
}
interface IPerfPayload {
    dns: number;
    tls: number;
    conn: number;
    response: number;
    render: number;
    dom_load: number;
    page_load: number;
    ttfb: number;
}
/**
 * The object returned by `trackPageViews()`, used to stop tracking pages.
 */
export interface PageActions {
    /** Stops the tracking of pages. */
    stop: () => void;
}
/**
 * The object returned by `trackErrors()`, used to stop tracking errors.
 */
export interface ErrorActions {
    /** Stops the tracking of errors. */
    stop: () => void;
}
export interface PageData {
    /** Current URL path. */
    path: string;
    /** The object returned by `trackPageViews()`, used to stop tracking pages. */
    actions: PageActions;
}
export interface ErrorOptions {
    /**
     * A number that indicates how many errors should be sent to the server.
     * Accepts values between 0 and 1. For example, if set to 0.5 - only ~50% of errors will be sent to Swetrix.
     * For testing, we recommend setting this value to 1. For production, you should configure it depending on your needs as each error event counts towards your plan.
     *
     * The default value for this option is 1.
     */
    sampleRate?: number;
    /**
     * Callback to edit / prevent sending errors.
     *
     * @param payload - The error payload.
     * @returns The edited payload or `false` to prevent sending the error event. If `true` is returned, the payload will be sent as-is.
     */
    callback?: (payload: IInternalErrorEventPayload) => Partial<IInternalErrorEventPayload> | boolean;
}
export interface PageViewsOptions {
    /**
     * If set to `true`, only unique events will be saved.
     * This param is useful when tracking single-page landing websites.
     */
    unique?: boolean;
    /** Send Heartbeat requests when the website tab is not active in the browser. */
    heartbeatOnBackground?: boolean;
    /**
     * Set to `true` to enable hash-based routing.
     * For example if you have pages like /#/path or want to track pages like /path#hash
     */
    hash?: boolean;
    /**
     * Set to `true` to enable search-based routing.
     * For example if you have pages like /path?search
     */
    search?: boolean;
    /**
     * Callback to edit / prevent sending pageviews.
     *
     * @param payload - The pageview payload.
     * @returns The edited payload or `false` to prevent sending the pageview. If `true` is returned, the payload will be sent as-is.
     */
    callback?: (payload: IPageViewPayload) => Partial<IPageViewPayload> | boolean;
}
export declare const defaultActions: {
    stop(): void;
};
export declare class Lib {
    private projectID;
    private options?;
    private pageData;
    private pageViewsOptions;
    private errorsOptions;
    private perfStatsCollected;
    private activePage;
    private errorListenerExists;
    constructor(projectID: string, options?: LibOptions | undefined);
    captureError(event: ErrorEvent): void;
    trackErrors(options?: ErrorOptions): ErrorActions;
    submitError(payload: IErrorEventPayload, evokeCallback?: boolean): void;
    track(event: TrackEventOptions): void;
    trackPageViews(options?: PageViewsOptions): PageActions;
    getPerformanceStats(): IPerfPayload | {};
    private heartbeat;
    private trackPathChange;
    private getPreviousPage;
    private trackPage;
    submitPageView(pg: string, prev: string | null | undefined, unique: boolean, perf: IPerfPayload | {}, evokeCallback?: boolean): void;
    private canTrack;
    private sendRequest;
}
export {};
