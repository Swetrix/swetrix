export interface LibOptions {
    debug?: boolean;
    disabled?: boolean;
    respectDNT?: boolean;
}
export interface TrackEventOptions {
    ev: string;
    unique?: boolean;
}
export interface PageData {
    path: string;
    actions: object;
}
export interface PageViewsOptions {
    unique?: boolean;
    ignore?: Array<any>;
}
export declare class Lib {
    private projectID;
    private options?;
    private pageData;
    private pageViewsOptions;
    constructor(projectID: string, options?: LibOptions | undefined);
    track(event: TrackEventOptions): void;
    trackPageViews(options?: PageViewsOptions): object | undefined;
    private checkIgnore;
    private trackPathChange;
    private trackPage;
    private debug;
    private canTrack;
    private submitData;
    private submitCustom;
}
