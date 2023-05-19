declare const isDevelopment: any;
declare const CAPTCHA_SELECTOR = ".swecaptcha";
declare const LIGHT_CAPTCHA_IFRAME_URL: string;
declare const DARK_CAPTCHA_IFRAME_URL: string;
declare const DEFAULT_RESPONSE_INPUT_NAME = "swetrix-captcha-response";
declare const MESSAGE_IDENTIFIER = "swetrix-captcha";
declare const ID_PREFIX = "swetrix-captcha-";
declare const THEMES: string[];
declare const PID_REGEX: RegExp;
declare enum LOG_ACTIONS {
    log = "log",
    error = "error",
    warn = "warn",
    info = "info"
}
declare const DUMMY_PIDS: string[];
declare const isValidPID: (pid: string) => boolean;
declare const FRAME_HEIGHT_MAPPING: {
    default: string;
    manual: string;
};
declare const getFrameID: (cid: string) => string;
declare const ids: string[];
declare const log: (status: LOG_ACTIONS, text: string) => void;
declare const appendParamsToURL: (url: string, params: any) => string;
declare const renderCaptcha: (container: Element, params: any) => void;
declare const generateRandomID: () => string;
declare const postMessageCallback: (pmEvent: MessageEvent) => void;
declare const generateCaptchaFrame: (params: any) => HTMLIFrameElement;
declare const generateHiddenInput: (params: any) => HTMLInputElement;
declare const validateParams: (params: any) => boolean;
declare const parseParams: (container: Element) => object;
declare const main: (forced?: boolean) => void;
