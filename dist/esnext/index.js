import { Lib } from './Lib';
export let LIB_INSTANCE = null;
// Initialise the tracking library instance (other methods won't work if the library
// is not initialised)
export function init(pid, options) {
    if (!LIB_INSTANCE) {
        LIB_INSTANCE = new Lib(pid, options);
    }
    return LIB_INSTANCE;
}
// Tracks custom events
export function track(event) {
    if (!LIB_INSTANCE)
        return;
    LIB_INSTANCE.track(event);
}
export function trackViews(options) {
    if (!LIB_INSTANCE)
        return;
    LIB_INSTANCE.trackPageViews(options);
}
//# sourceMappingURL=index.js.map