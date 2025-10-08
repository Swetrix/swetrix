const https = require('https')
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

const DESTINATION_FILE = 'ip-geolocation-db.mmdb'
const DESTINATION_FOLDER = path.join(__dirname, '../')
const DESTINATION_PATH = path.join(DESTINATION_FOLDER, DESTINATION_FILE)

function parseApiKeyFromArgs() {
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--api-key' || arg === '-k') {
      return args[i + 1]
    }
    if (arg.startsWith('--api-key=')) {
      return arg.split('=')[1]
    }
  }
  return undefined
}

function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true })
  }
}

function followableGet(url, options = {}, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, options, response => {
      const status = response.statusCode || 0
      if ([301, 302, 303, 307, 308].includes(status)) {
        if (maxRedirects <= 0) {
          reject(new Error('Too many redirects'))
          return
        }
        const location = response.headers.location
        if (!location) {
          reject(new Error('Redirect with no Location header'))
          return
        }
        // Drain response before redirecting
        response.resume()
        followableGet(location, options, maxRedirects - 1)
          .then(resolve)
          .catch(reject)
        return
      }
      resolve(response)
    })
    request.on('error', reject)
  })
}

async function fetchDbipAccountInfo(apiKey) {
  const metadataUrl = `https://db-ip.com/account/${apiKey}/db/ip-to-location/`
  const response = await followableGet(metadataUrl, {
    headers: { Accept: 'application/json' },
  })

  return new Promise((resolve, reject) => {
    if ((response.statusCode || 0) !== 200) {
      reject(
        new Error(
          `Failed to fetch metadata. HTTP ${response.statusCode}. Is the API key valid?`,
        ),
      )
      return
    }
    const chunks = []
    response.on('data', chunk => chunks.push(chunk))
    response.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        const json = JSON.parse(text)
        resolve(json)
      } catch (e) {
        reject(new Error('Failed to parse metadata JSON'))
      }
    })
    response.on('error', reject)
  })
}

function downloadMmdb(url, shouldGunzip, destinationPath) {
  console.log(`Downloading ${url} ...`)
  return new Promise((resolve, reject) => {
    followableGet(url)
      .then(response => {
        if ((response.statusCode || 0) !== 200) {
          reject(new Error(`Download failed. HTTP ${response.statusCode}`))
          return
        }

        const tempPath = `${destinationPath}.download`
        const fileStream = fs.createWriteStream(tempPath)

        const onFinish = () => {
          try {
            if (fs.existsSync(destinationPath)) fs.unlinkSync(destinationPath)
            fs.renameSync(tempPath, destinationPath)
            console.log('[OK] Download finished!')
            resolve()
          } catch (e) {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
            reject(e)
          }
        }

        const onError = error => {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
          reject(error)
        }

        if (shouldGunzip) {
          const gunzip = zlib.createGunzip()
          response.pipe(gunzip).pipe(fileStream)
          fileStream.on('finish', onFinish)
          fileStream.on('error', onError)
          gunzip.on('error', onError)
        } else {
          response.pipe(fileStream)
          fileStream.on('finish', onFinish)
          fileStream.on('error', onError)
        }
      })
      .catch(reject)
  })
}

;(async () => {
  try {
    const apiKey = parseApiKeyFromArgs()
    if (!apiKey) {
      console.error(
        'Usage: node backend/meta/dbip-commercial-sync.js --api-key <YOUR_DBIP_API_KEY>',
      )
      process.exit(1)
    }

    ensureFolderExists(DESTINATION_FOLDER)

    const metadata = await fetchDbipAccountInfo(apiKey)
    if (!metadata || !metadata.mmdb || !metadata.mmdb.url) {
      throw new Error('Metadata JSON does not contain mmdb.url')
    }

    const mmdbUrl = metadata.mmdb.url
    const mmdbDate = metadata.mmdb.date || 'Unknown date'
    const mmdbName = metadata.mmdb.name || ''

    console.log(`[INFO] Downloading DB-IP mmdb for: ${mmdbDate}`)

    const shouldGunzip = mmdbName.endsWith('.gz')
    await downloadMmdb(mmdbUrl, shouldGunzip, DESTINATION_PATH)

    console.log(`[OK] Saved to ${DESTINATION_PATH}`)
  } catch (error) {
    console.error('[ERROR] An error occurred:', error.message)
    process.exitCode = 1
  }
})()
