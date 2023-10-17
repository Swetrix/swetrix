interface IGetPath {
    hash?: boolean;
    search?: boolean;
}
export declare const isInBrowser: () => boolean;
export declare const isLocalhost: () => boolean;
export declare const isAutomated: () => boolean;
export declare const getLocale: () => string;
export declare const getTimezone: () => string | undefined;
export declare const getReferrer: () => string | undefined;
export declare const getUTMSource: () => string | undefined;
export declare const getUTMMedium: () => string | undefined;
export declare const getUTMCampaign: () => string | undefined;
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
export declare const getPath: (options: IGetPath) => string;
export {};
