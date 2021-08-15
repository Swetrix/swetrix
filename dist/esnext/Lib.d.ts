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
}
export declare class Lib {
    private projectID;
    private options?;
    private pageData;
    constructor(projectID: string, options?: LibOptions | undefined);
    track(event: TrackEventOptions): void;
    trackPageViews(options?: PageViewsOptions): object | undefined;
    private trackPathChange;
    private trackPage;
    private debug;
    private canTrack;
    private submitData;
    private submitCustom;
}
