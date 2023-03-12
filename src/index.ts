import { makeAPIRequest, ENDPOINTS } from './utils'

/**
 * Function to validate the CAPTCHA token.
 *
 * @param {string | object} token The CAPTCHA token.
 * @param {string} secret The secret API key.
 * @param {string | null} apiURL The API URL to use (default: https://api.swetrix.com/captcha).
 * @returns {Promise<[boolean, object | null]>} The result of the validation.
 */
export async function validateToken(token: string | any, secret: string, apiURL?: string): Promise<[boolean, object | string]> {
  let res

  let _token = typeof token === 'string' ? token : token?.token

  if (!_token) {
    return [false, 'CAPTCHA token is missing']
  }

  try {
    res = await makeAPIRequest(ENDPOINTS.VALIDATE, 'POST', {
      token: _token,
      secret,
    }, apiURL)
  } catch (e: any) {
    return [false, e]
  }

  const { success, data } = res

  if (!success) {
    return [false, 'CAPTCHA validation failed']
  }

  return [true, data]
}
