import { Lib, defaultActions, } from './Lib.js';
export let LIB_INSTANCE = null;
/**
 * Initialise the tracking library instance (other methods won't work if the library is not initialised).
 *
 * @param {string} pid The Project ID to link the instance of Swetrix.js to.
 * @param {LibOptions} options Options related to the tracking.
 * @returns {Lib} Instance of the Swetrix.js.
 */
export function init(pid, options) {
    if (!LIB_INSTANCE) {
        LIB_INSTANCE = new Lib(pid, options);
    }
    return LIB_INSTANCE;
}
/**
 * With this function you are able to track any custom events you want.
 * You should never send any identifiable data (like User ID, email, session cookie, etc.) as an event name.
 * The total number of track calls and their conversion rate will be saved.
 *
 * @param {TrackEventOptions} event The options related to the custom event.
 */
export async function track(event) {
    if (!LIB_INSTANCE)
        return;
    await LIB_INSTANCE.track(event);
}
/**
 * With this function you are able to automatically track pageviews across your application.
 *
 * @param {PageViewsOptions} options Pageviews tracking options.
 * @returns {PageActions} The actions related to the tracking. Used to stop tracking pages.
 */
export function trackViews(options) {
    return new Promise((resolve) => {
        if (!LIB_INSTANCE) {
            resolve(defaultActions);
            return;
        }
        // We need to verify that document.readyState is complete for the performance stats to be collected correctly.
        if (typeof document === 'undefined' || document.readyState === 'complete') {
            resolve(LIB_INSTANCE.trackPageViews(options));
        }
        else {
            window.addEventListener('load', () => {
                // @ts-ignore
                resolve(LIB_INSTANCE.trackPageViews(options));
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
export function trackErrors(options) {
    if (!LIB_INSTANCE) {
        return defaultActions;
    }
    return LIB_INSTANCE.trackErrors(options);
}
/**
 * This function is used to manually track an error event.
 * It's useful if you want to track specific errors in your application.
 *
 * @param payload Swetrix error object to send.
 * @returns void
 */
export function trackError(payload) {
    if (!LIB_INSTANCE)
        return;
    LIB_INSTANCE.submitError(payload, false);
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
export function trackPageview(pg, _prev, unique) {
    if (!LIB_INSTANCE)
        return;
    LIB_INSTANCE.submitPageView({ pg }, Boolean(unique), {});
}
export function pageview(options) {
    if (!LIB_INSTANCE)
        return;
    LIB_INSTANCE.submitPageView(options.payload, Boolean(options.unique), {});
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
export async function getFeatureFlags(options, forceRefresh) {
    if (!LIB_INSTANCE)
        return {};
    return LIB_INSTANCE.getFeatureFlags(options, forceRefresh);
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
export async function getFeatureFlag(key, options, defaultValue = false) {
    if (!LIB_INSTANCE)
        return defaultValue;
    return LIB_INSTANCE.getFeatureFlag(key, options, defaultValue);
}
/**
 * Clears the cached feature flags, forcing a fresh fetch on the next call.
 * Useful when you know the user's context has changed significantly.
 */
export function clearFeatureFlagsCache() {
    if (!LIB_INSTANCE)
        return;
    LIB_INSTANCE.clearFeatureFlagsCache();
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
export async function getExperiments(options, forceRefresh) {
    if (!LIB_INSTANCE)
        return {};
    return LIB_INSTANCE.getExperiments(options, forceRefresh);
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
export async function getExperiment(experimentId, options, defaultVariant = null) {
    if (!LIB_INSTANCE)
        return defaultVariant;
    return LIB_INSTANCE.getExperiment(experimentId, options, defaultVariant);
}
/**
 * Clears the cached experiments, forcing a fresh fetch on the next call.
 * This is an alias for clearFeatureFlagsCache since experiments and flags share the same cache.
 */
export function clearExperimentsCache() {
    if (!LIB_INSTANCE)
        return;
    LIB_INSTANCE.clearExperimentsCache();
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
export async function getProfileId() {
    if (!LIB_INSTANCE)
        return null;
    return LIB_INSTANCE.getProfileId();
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
export async function getSessionId() {
    if (!LIB_INSTANCE)
        return null;
    return LIB_INSTANCE.getSessionId();
}
//# sourceMappingURL=index.js.map