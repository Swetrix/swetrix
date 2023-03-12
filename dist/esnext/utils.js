const DEFAULT_API_HOST = 'https://api.swetrix.com/captcha';
export const ENDPOINTS = {
    VALIDATE: '/validate',
};
export const makeAPIRequest = async (path, method, body, apiURL) => {
    let res;
    try {
        res = await fetch(`${apiURL || DEFAULT_API_HOST}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    }
    catch (e) {
        throw `Unable to make API request, error: ${e}`;
    }
    return await res.json();
};
//# sourceMappingURL=utils.js.map