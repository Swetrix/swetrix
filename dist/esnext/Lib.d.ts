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
    /**
     * Optional profile ID for long-term user tracking.
     * If set, it will be used for all pageviews and events unless overridden per-call.
     */
    profileId?: string;
}
export interface TrackEventOptions {
    /** The custom event name. */
    ev: string;
    /** If set to `true`, only 1 event with the same ID will be saved per user session. */
    unique?: boolean;
    /** Event-related metadata object with string values. */
    meta?: {
        [key: string]: string | number | boolean | null | undefined;
    };
    /** Optional profile ID for long-term user tracking. Overrides the global profileId if set. */
    profileId?: string;
}
export interface IPageViewPayload {
    lc?: string;
    tz?: string;
    ref?: string;
    so?: string;
    me?: string;
    ca?: string;
    te?: string;
    co?: string;
    pg?: string | null;
    /** Pageview-related metadata object with string values. */
    meta?: {
        [key: string]: string | number | boolean | null | undefined;
    };
    /** Optional profile ID for long-term user tracking. Overrides the global profileId if set. */
    profileId?: string;
}
export interface IErrorEventPayload {
    name: string;
    message?: string | null;
    lineno?: number | null;
    colno?: number | null;
    filename?: string | null;
    stackTrace?: string | null;
    meta?: {
        [key: string]: string | number | boolean | null | undefined;
    };
}
export interface IInternalErrorEventPayload extends IErrorEventPayload {
    lc?: string;
    tz?: string;
    pg?: string | null;
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
 * Options for evaluating feature flags.
 */
export interface FeatureFlagsOptions {
    /**
     * Optional profile ID for long-term user tracking.
     * If not provided, an anonymous profile ID will be generated server-side based on IP and user agent.
     * Overrides the global profileId if set.
     */
    profileId?: string;
}
/**
 * Options for evaluating experiments.
 */
export interface ExperimentOptions {
    /**
     * Optional profile ID for long-term user tracking.
     * If not provided, an anonymous profile ID will be generated server-side based on IP and user agent.
     * Overrides the global profileId if set.
     */
    profileId?: string;
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
    private pageViewsOptions?;
    private errorsOptions?;
    private perfStatsCollected;
    private activePage;
    private errorListenerExists;
    private cachedData;
    constructor(projectID: string, options?: LibOptions | undefined);
    captureError(event: ErrorEvent): void;
    trackErrors(options?: ErrorOptions): ErrorActions;
    submitError(payload: IErrorEventPayload, evokeCallback?: boolean): void;
    track(event: TrackEventOptions): Promise<void>;
    trackPageViews(options?: PageViewsOptions): PageActions;
    getPerformanceStats(): IPerfPayload | {};
    /**
     * Fetches all feature flags and experiments for the project.
     * Results are cached for 5 minutes by default.
     *
     * @param options - Options for evaluating feature flags.
     * @param forceRefresh - If true, bypasses the cache and fetches fresh data.
     * @returns A promise that resolves to a record of flag keys to boolean values.
     */
    getFeatureFlags(options?: FeatureFlagsOptions, forceRefresh?: boolean): Promise<Record<string, boolean>>;
    /**
     * Internal method to fetch both feature flags and experiments from the API.
     */
    private fetchFlagsAndExperiments;
    /**
     * Gets the value of a single feature flag.
     *
     * @param key - The feature flag key.
     * @param options - Options for evaluating the feature flag.
     * @param defaultValue - Default value to return if the flag is not found. Defaults to false.
     * @returns A promise that resolves to the boolean value of the flag.
     */
    getFeatureFlag(key: string, options?: FeatureFlagsOptions, defaultValue?: boolean): Promise<boolean>;
    /**
     * Clears the cached feature flags and experiments, forcing a fresh fetch on the next call.
     */
    clearFeatureFlagsCache(): void;
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
    getExperiments(options?: ExperimentOptions, forceRefresh?: boolean): Promise<Record<string, string>>;
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
    getExperiment(experimentId: string, options?: ExperimentOptions, defaultVariant?: string | null): Promise<string | null>;
    /**
     * Clears the cached experiments (alias for clearFeatureFlagsCache since they share the same cache).
     */
    clearExperimentsCache(): void;
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
    getProfileId(): Promise<string | null>;
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
    getSessionId(): Promise<string | null>;
    /**
     * Gets the API base URL (without /log suffix).
     */
    private getApiBase;
    private heartbeat;
    private trackPathChange;
    private trackPage;
    submitPageView(payload: Partial<IPageViewPayload>, unique: boolean, perf: IPerfPayload | {}, evokeCallback?: boolean): void;
    private canTrack;
    private sendRequest;
}
export {};
