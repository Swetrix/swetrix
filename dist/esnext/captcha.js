"use strict";
// @ts-ignore
const isDevelopment = window.__SWETRIX_CAPTCHA_DEV || false;
const API_URL = isDevelopment ? 'http://localhost:5005/v1/captcha' : 'https://api.swetrix.com/v1/captcha';
const MSG_IDENTIFIER = 'swetrix-captcha';
const DEFAULT_THEME = 'light';
const CAPTCHA_TOKEN_LIFETIME = 300; // seconds (5 minutes).
let TOKEN = '';
let HASH = '';
const ENDPOINTS = {
    VERIFY: '/verify',
    GENERATE: '/generate',
    VERIFY_MANUAL: '/verify-manual',
};
var IFRAME_MESSAGE_TYPES;
(function (IFRAME_MESSAGE_TYPES) {
    IFRAME_MESSAGE_TYPES["SUCCESS"] = "success";
    IFRAME_MESSAGE_TYPES["FAILURE"] = "failure";
    IFRAME_MESSAGE_TYPES["TOKEN_EXPIRED"] = "tokenExpired";
    IFRAME_MESSAGE_TYPES["MANUAL_STARTED"] = "manualStarted";
    IFRAME_MESSAGE_TYPES["MANUAL_FINISHED"] = "manualFinished";
})(IFRAME_MESSAGE_TYPES || (IFRAME_MESSAGE_TYPES = {}));
var ACTION;
(function (ACTION) {
    ACTION["checkbox"] = "checkbox";
    ACTION["failure"] = "failure";
    ACTION["completed"] = "completed";
    ACTION["loading"] = "loading";
})(ACTION || (ACTION = {}));
let activeAction = ACTION.checkbox;
const sendMessageToLoader = (event, data = {}) => {
    window.parent.postMessage({
        event,
        type: MSG_IDENTIFIER,
        // @ts-ignore
        cid: window.__SWETRIX_CAPTCHA_ID,
        ...data,
    }, '*');
};
/**
 * Sets the provided action visible and the rest hidden
 * @param {*} action checkbox | failure | completed | loading
 */
const activateAction = (action) => {
    activeAction = action;
    const statusDefault = document.querySelector('#status-default');
    const statusFailure = document.querySelector('#status-failure');
    const actions = {
        checkbox: document.querySelector('#checkbox'),
        failure: document.querySelector('#failure'),
        completed: document.querySelector('#completed'),
        loading: document.querySelector('#loading'),
    };
    // Apply hidden class to all actions
    actions.checkbox?.classList.add('hidden');
    actions.failure?.classList.add('hidden');
    actions.completed?.classList.add('hidden');
    actions.loading?.classList.add('hidden');
    // Change the status text
    if (action === 'failure') {
        statusDefault?.classList.add('hidden');
        statusFailure?.classList.remove('hidden');
    }
    else {
        statusDefault?.classList.remove('hidden');
        statusFailure?.classList.add('hidden');
    }
    // Remove hidden class from the provided action
    actions[action]?.classList.remove('hidden');
};
const setLifetimeTimeout = () => {
    setTimeout(() => {
        sendMessageToLoader(IFRAME_MESSAGE_TYPES.TOKEN_EXPIRED);
        activateAction(ACTION.checkbox);
    }, CAPTCHA_TOKEN_LIFETIME * 1000);
};
const enableManualChallenge = (svg) => {
    const manualChallenge = document.querySelector('#manual-challenge');
    const svgCaptcha = document.querySelector('#svg-captcha');
    if (!svgCaptcha) {
        return;
    }
    if (!svg) {
        const error = document.createElement('p');
        error.innerText = 'Error loading captcha';
        error.style.color = '#d6292a';
        svgCaptcha?.appendChild(error);
    }
    else {
        svgCaptcha.innerHTML = svg;
    }
    sendMessageToLoader(IFRAME_MESSAGE_TYPES.MANUAL_STARTED);
    manualChallenge?.classList.remove('hidden');
};
const disableManualChallenge = () => {
    const manualChallenge = document.querySelector('#manual-challenge');
    const svgCaptcha = document.querySelector('#svg-captcha');
    if (!svgCaptcha) {
        return;
    }
    sendMessageToLoader(IFRAME_MESSAGE_TYPES.MANUAL_FINISHED);
    svgCaptcha.innerHTML = '';
    manualChallenge?.classList.add('hidden');
};
const generateCaptcha = async () => {
    try {
        const response = await fetch(`${API_URL}${ENDPOINTS.GENERATE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // @ts-ignore
                theme: window.__SWETRIX_CAPTCHA_THEME || DEFAULT_THEME,
                // @ts-ignore
                pid: window.__SWETRIX_PROJECT_ID,
            }),
        });
        if (!response.ok) {
            throw '';
        }
        const data = await response.json();
        return data;
    }
    catch (e) {
        sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE);
        activateAction(ACTION.failure);
        return {};
    }
};
const verify = async () => {
    try {
        const response = await fetch(`${API_URL}${ENDPOINTS.VERIFY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // @ts-ignore
                pid: window.__SWETRIX_PROJECT_ID,
            }),
        });
        if (!response.ok) {
            return {};
        }
        const data = await response.json();
        return data;
    }
    catch (e) {
        sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE);
        activateAction(ACTION.failure);
        return {};
    }
};
document.addEventListener('DOMContentLoaded', () => {
    const captchaComponent = document.querySelector('#swetrix-captcha');
    const branding = document.querySelector('#branding');
    const svgCaptchaInput = document.querySelector('#svg-captcha-input');
    const manualSubmitBtn = document.querySelector('#manual-submit-btn');
    branding?.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    manualSubmitBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!svgCaptchaInput) {
            return;
        }
        // @ts-ignore
        const code = svgCaptchaInput.value;
        if (!code) {
            return;
        }
        let response;
        try {
            response = await fetch(`${API_URL}${ENDPOINTS.VERIFY_MANUAL}`, {
                method: 'POST',
                body: JSON.stringify({
                    hash: HASH,
                    code,
                    // @ts-ignore
                    pid: window.__SWETRIX_PROJECT_ID,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }
        catch (e) {
            disableManualChallenge();
            sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE);
            activateAction(ACTION.failure);
            // @ts-ignore
            svgCaptchaInput.value = '';
            return;
        }
        if (!response.ok) {
            disableManualChallenge();
            sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE);
            activateAction(ACTION.failure);
            // @ts-ignore
            svgCaptchaInput.value = '';
            return;
        }
        const { success, token } = await response.json();
        if (!success) {
            disableManualChallenge();
            sendMessageToLoader(IFRAME_MESSAGE_TYPES.FAILURE);
            activateAction(ACTION.failure);
            // @ts-ignore
            svgCaptchaInput.value = '';
            return;
        }
        // @ts-ignore
        svgCaptchaInput.value = '';
        sendMessageToLoader(IFRAME_MESSAGE_TYPES.SUCCESS, { token });
        setLifetimeTimeout();
        activateAction(ACTION.completed);
        disableManualChallenge();
    });
    captchaComponent?.addEventListener('click', async () => {
        if (activeAction === ACTION.loading || activeAction === ACTION.completed) {
            return;
        }
        if (activeAction === ACTION.failure) {
            activateAction(ACTION.checkbox);
            return;
        }
        activateAction(ACTION.loading);
        try {
            const { token } = await verify();
            if (!token) {
                throw '';
            }
            TOKEN = token;
            sendMessageToLoader(IFRAME_MESSAGE_TYPES.SUCCESS, { token });
            setLifetimeTimeout();
            activateAction(ACTION.completed);
            return;
        }
        catch (e) {
            const { data, hash } = await generateCaptcha();
            HASH = hash;
            enableManualChallenge(data);
            return;
        }
    });
});
//# sourceMappingURL=captcha.js.map