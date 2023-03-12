import https from 'https'

const DEFAULT_API_HOST = 'https://api.swetrix.com/captcha'

export const ENDPOINTS = {
  VALIDATE: '/validate',
}

export const makeAPIRequest = async (path: string, method: string, body: object, apiURL?: string): Promise<any> => {
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
    const url = `${apiURL || DEFAULT_API_HOST}${path}`

    const req = https.request(url, options, (res: any) => {
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
