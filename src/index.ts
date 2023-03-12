import { makeAPIRequest, ENDPOINTS } from './utils'

/**
 * Function to validate the CAPTCHA token.
 *
 * @param {string} token The CAPTCHA token.
 * @param {string} secret The secret API key.
 * @param {number} timestamp The timestamp of the CAPTCHA pass.
 * @param {string | null} hash The hash of the CAPTCHA pass.
 * @param {string | null} apiURL The API URL to use (default: https://api.swetrix.com/captcha).
 * @returns {Promise<[boolean, object | null]>} The result of the validation.
 */
export async function validateToken(token: string, secret: string, timestamp: number, hash?: string, apiURL?: string): Promise<[boolean, object | string]> {
  let res

  try {
    res = await makeAPIRequest(ENDPOINTS.VALIDATE, 'POST', {
      token,
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
