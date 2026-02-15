import { Lib, LibOptions, TrackEventOptions, PageViewsOptions, ErrorOptions, PageActions, ErrorActions, IErrorEventPayload, IPageViewPayload, FeatureFlagsOptions, ExperimentOptions } from './Lib.js';
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
export declare function track(event: TrackEventOptions): Promise<void>;
/**
 * With this function you are able to automatically track pageviews across your application.
 *
 * @param {PageViewsOptions} options Pageviews tracking options.
 * @returns {PageActions} The actions related to the tracking. Used to stop tracking pages.
 */
export declare function trackViews(options?: PageViewsOptions): Promise<PageActions>;
/**
 * This function is used to set up automatic error events tracking.
 * It set's up an error listener, and whenever an error happens, it gets tracked.
 *
 * @returns {ErrorActions} The actions related to the tracking. Used to stop tracking errors.
 */
export declare function trackErrors(options?: ErrorOptions): ErrorActions;
/**
 * This function is used to manually track an error event.
 * It's useful if you want to track specific errors in your application.
 *
 * @param payload Swetrix error object to send.
 * @returns void
 */
export declare function trackError(payload: IErrorEventPayload): void;
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
export declare function trackPageview(pg: string, _prev?: string, unique?: boolean): void;
export interface IPageviewOptions {
    payload: Partial<IPageViewPayload>;
    unique?: boolean;
}
export declare function pageview(options: IPageviewOptions): void;
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
export declare function getFeatureFlags(options?: FeatureFlagsOptions, forceRefresh?: boolean): Promise<Record<string, boolean>>;
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
export declare function getFeatureFlag(key: string, options?: FeatureFlagsOptions, defaultValue?: boolean): Promise<boolean>;
/**
 * Clears the cached feature flags, forcing a fresh fetch on the next call.
 * Useful when you know the user's context has changed significantly.
 */
export declare function clearFeatureFlagsCache(): void;
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
export declare function getExperiments(options?: ExperimentOptions, forceRefresh?: boolean): Promise<Record<string, string>>;
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
export declare function getExperiment(experimentId: string, options?: ExperimentOptions, defaultVariant?: string | null): Promise<string | null>;
/**
 * Clears the cached experiments, forcing a fresh fetch on the next call.
 * This is an alias for clearFeatureFlagsCache since experiments and flags share the same cache.
 */
export declare function clearExperimentsCache(): void;
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
export declare function getProfileId(): Promise<string | null>;
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
export declare function getSessionId(): Promise<string | null>;
export { LibOptions, TrackEventOptions, PageViewsOptions, ErrorOptions, PageActions, ErrorActions, IErrorEventPayload, IPageViewPayload, FeatureFlagsOptions, ExperimentOptions, };
