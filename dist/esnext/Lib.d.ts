export interface LibOptions {
    /**
     * When set to `true`, all tracking logs will be printed to console and localhost events will be sent to server.
     */
    debug?: boolean;
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
}
/**
 * The object returned by `trackPageViews()`, used to stop tracking pages.
 */
export interface PageActions {
    /** Stops the tracking of pages. */
    stop: () => void;
}
export interface PageData {
    /** Current URL path. */
    path: string;
    /** The object returned by `trackPageViews()`, used to stop tracking pages. */
    actions: PageActions;
}
export interface PageViewsOptions {
    /**
     * If set to `true`, only unique events will be saved.
     * This param is useful when tracking single-page landing websites.
     */
    unique?: boolean;
    /** A list of Regular Expressions or string pathes to ignore. */
    ignore?: Array<string | RegExp>;
    /** Do not send Heartbeat requests to the server. */
    noHeartbeat?: boolean;
    /** Send Heartbeat requests when the website tab is not active in the browser. */
    heartbeatOnBackground?: boolean;
}
export declare const defaultPageActions: {
    stop(): void;
};
export declare class Lib {
    private projectID;
    private options?;
    private pageData;
    private pageViewsOptions;
    constructor(projectID: string, options?: LibOptions | undefined);
    track(event: TrackEventOptions): void;
    trackPageViews(options?: PageViewsOptions): PageActions;
    private heartbeat;
    private checkIgnore;
    private trackPathChange;
    private trackPage;
    private debug;
    private canTrack;
    private sendRequest;
}
