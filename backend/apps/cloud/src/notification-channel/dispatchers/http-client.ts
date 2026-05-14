import * as http from 'http'
import * as https from 'https'
import { useAgent } from 'request-filtering-agent'

interface PostOptions {
  url: string
  headers: Record<string, string>
  body: string
  timeoutMs: number
}

interface PostResponse {
  ok: boolean
  status: number
}

export const postWithFilteredAgent = ({
  url,
  headers,
  body,
  timeoutMs,
}: PostOptions): Promise<PostResponse> => {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const transport = target.protocol === 'https:' ? https : http

    let settled = false
    let req: http.ClientRequest

    const finish = (handler: () => void) => {
      if (settled) return
      settled = true
      handler()
    }

    req = transport.request(
      target,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(body).toString(),
        },
        agent: useAgent(url),
      },
      (res) => {
        const status = res.statusCode ?? 0

        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          finish(() => reject(new Error('Redirects are not allowed')))
          return
        }

        res.resume()
        res.on('end', () =>
          finish(() => resolve({ status, ok: status >= 200 && status < 300 })),
        )
        res.on('error', (reason) => finish(() => reject(reason)))
      },
    )

    req.on('error', (reason) => finish(() => reject(reason)))
    req.setTimeout(timeoutMs, () => {
      finish(() => {
        req.destroy()
        reject(new Error(`Request timed out after ${timeoutMs}ms`))
      })
    })

    req.write(body)
    req.end()
  })
}
