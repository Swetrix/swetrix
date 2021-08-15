import { Lib, LibOptions, TrackEventOptions, PageViewsOptions } from './Lib';
export declare let LIB_INSTANCE: Lib | null;
export declare function init(pid: string, options?: LibOptions): Lib;
export declare function track(event: TrackEventOptions): void;
export declare function trackViews(options?: PageViewsOptions): void;
