/* eslint-disable */
const https = require('https')
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')

// Generate the download link with the current date
const currentDate = new Date()
const year = currentDate.getFullYear()
const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
const DOWNLOAD_LINK = `https://download.db-ip.com/free/dbip-city-lite-${year}-${month}.mmdb.gz`

const DESTINATION_FILE = 'dbip-city-lite.mmdb'
const ORIGINAL_FILE = 'dbip-city-lite.mmdb.gz'
const DESTINATION_FOLDER = path.join(__dirname, '../')
const GEOIP_DB_PATH = path.join(DESTINATION_FOLDER, ORIGINAL_FILE)
const UNZIPPED_PATH = path.join(DESTINATION_FOLDER, DESTINATION_FILE)

// Function to download a file
function downloadFile(url, destPath) {
  console.log(`Downloading ${url} to ${destPath}...`)

  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destPath)

    https.get(url, (response) => {
      response.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close()
        console.log('[OK] Download finished!')
        resolve()
      })

      fileStream.on('error', (error) => {
        fs.unlinkSync(destPath)
        console.log('[ERROR] Download failed.')
        reject(error)
      })
    }).on('error', (error) => {
      fs.unlinkSync(destPath)
      console.log('[ERROR] Download failed.')
      reject(error)
    })
  })
}

(async () => {
  try {
    await downloadFile(DOWNLOAD_LINK, GEOIP_DB_PATH)

    const gunzip = zlib.createGunzip()
    const inputStream = fs.createReadStream(GEOIP_DB_PATH)
    const outputStream = fs.createWriteStream(UNZIPPED_PATH)

    inputStream.pipe(gunzip).pipe(outputStream)
    outputStream.on('finish', () => {
      console.log('[OK] File unzipped! .gz file removed.')
      fs.unlinkSync(GEOIP_DB_PATH) // Remove the original .gz file
    })
    outputStream.on('error', (error) => {
      fs.unlinkSync(GEOIP_DB_PATH)
      console.error('[ERROR] Could not unzip file:', error.message)
    })
  } catch (error) {
    console.error('[ERROR] An error occured:', error.message)
  }
})()
