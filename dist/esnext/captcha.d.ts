declare const isDevelopment: any;
declare const API_URL: string;
declare const MSG_IDENTIFIER = "swetrix-captcha";
declare const DEFAULT_THEME = "light";
declare const CAPTCHA_TOKEN_LIFETIME = 300;
declare let TOKEN: string;
declare let HASH: string;
declare const ENDPOINTS: {
    VERIFY: string;
    GENERATE: string;
    VERIFY_MANUAL: string;
};
declare enum IFRAME_MESSAGE_TYPES {
    SUCCESS = "success",
    FAILURE = "failure",
    TOKEN_EXPIRED = "tokenExpired",
    MANUAL_STARTED = "manualStarted",
    MANUAL_FINISHED = "manualFinished"
}
declare enum ACTION {
    checkbox = "checkbox",
    failure = "failure",
    completed = "completed",
    loading = "loading"
}
declare let activeAction: ACTION;
declare const sendMessageToLoader: (event: IFRAME_MESSAGE_TYPES, data?: {}) => void;
/**
 * Sets the provided action visible and the rest hidden
 * @param {*} action checkbox | failure | completed | loading
 */
declare const activateAction: (action: ACTION) => void;
declare const setLifetimeTimeout: () => void;
declare const enableManualChallenge: (svg: string) => void;
declare const disableManualChallenge: () => void;
declare const generateCaptcha: () => Promise<any>;
declare const verify: () => Promise<any>;
