import https from 'https'
import http from 'http'

const DEFAULT_API_HOST = 'https://api.swetrix.com/v1/captcha'

export const ENDPOINTS = {
  VALIDATE: '/validate',
}

export const makeAPIRequest = async (path: string, method: string, body: object, apiURL?: string): Promise<any> => {
  const url = `${apiURL || DEFAULT_API_HOST}${path}`
  const isHTTPSUrl = url.startsWith('https://')

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  if (body) {
    // @ts-ignore
    options.body = JSON.stringify(body)
  }

  return new Promise((resolve, reject) => {
    let req

    if (isHTTPSUrl) {
      req = https.request(url, options, (res: any) => {
        let data = ''

        res.on('data', (chunk: any) => {
          data += chunk
        })

        res.on('end', () => {
          if (res.statusCode >= 400) {
            reject(`Request failed with status code ${res.statusCode}: ${data}`)
          } else {
            try {
              resolve(JSON.parse(data))
            } catch (e) {
              reject(`Unable to parse JSON response: ${data}`)
            }
          }
        })
      })
    } else {
      req = http.request(url, options, (res: any) => {
        let data = ''

        res.on('data', (chunk: any) => {
          data += chunk
        })

        res.on('end', () => {
          if (res.statusCode >= 400) {
            reject(`Request failed with status code ${res.statusCode}: ${data}`)
          } else {
            try {
              resolve(JSON.parse(data))
            } catch (e) {
              reject(`Unable to parse JSON response: ${data}`)
            }
          }
        })
      })
    }

    req.on('error', (e) => {
      reject(`Unable to make API request, error: ${e}`)
    })

    if (body) {
      // @ts-ignore
      req.write(options.body)
    }

    req.end()
  })
}
