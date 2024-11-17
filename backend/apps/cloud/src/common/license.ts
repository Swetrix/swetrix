/*
  This module ensures that you cannot run Swetrix Cloud without a valid license key.

  The software contained within the cloud/ directory are Copyright © Swetrix Ltd.

  We have made this code available solely for informational and transparency purposes. No rights are granted to use, distribute, or exploit this software in any form.

  Any attempt to disable or modify the behavior of this module will be considered a violation of copyright.

  If you wish to use the Swetrix Cloud for your own requirements, please contact us at contact@swetrix.com to discuss obtaining a license.
*/

import 'dotenv/config'
import { createHash } from 'crypto'
import { isDevelopment } from './constants'

const SWETRIX_LICENSE_HASH =
  'af23eec423f59f00e26bceabbe1ca152de2b24619ebfafd5d5b8242b7702c705'

export const validateLicense = () => {
  if (isDevelopment) {
    return
  }

  const licenseKey = process.env.SWETRIX_LICENSE_KEY

  if (!licenseKey) {
    throw new Error(
      'SWETRIX_LICENSE_KEY environment variable is not set. Please contact contact@swetrix.com to acquire a license.',
    )
  }

  const hash = createHash('sha256').update(licenseKey).digest('hex')

  if (hash !== SWETRIX_LICENSE_HASH) {
    throw new Error(
      'Invalid license key provided for Swetrix Enterprise (Cloud) Edition. Please contact contact@swetrix.com to acquire a license.',
    )
  }
}
