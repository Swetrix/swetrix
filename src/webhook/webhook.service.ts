import { Injectable, BadRequestException } from '@nestjs/common'
import * as crypto from 'crypto'
import * as Serialize from 'php-serialize'
import { AppLoggerService } from '../logger/logger.service'

const PADDLE_PUB_KEY = ` -----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAqFcHslKkXcJlTYg4FL6j
XIKu0jM8PUMHRNbseLVqXS81DX7C5rZbacs6mU9MpyZv0QEXjiyZ9zXbQH5200Nx
7Jv/e5ZdXwIZc6jIMSdxY5Oxuw3ZSRZnHxZp3CD56QfbtnzKsvgRYKMfwdiYE9iC
7glB5Q++GHmfvgGKHqQtXaSpgYIREMO3XMYTBX2lqkdUZKnFFGEsL1ZgCiPGZjw8
DLVNrDAfDsPBy/hubZnrs3wFuP4ZywDG7vNU5nLCOt7nx5IiCBvlOcFpfYxpyV7+
OXLlANuYY6fM1PNjnAt6Eo8R+2bZcB9Xn2JusiS7NQavVbSHsvuZsI+6Q2T3dEr7
TAqkc4JDL/AjZcbJW2EGU9RakZ0lgj5aAwAMxn/s1mQ6s+UCe9S8fJnsbu07tRY8
oTrbUhdemtk1I+n2OWYJttsL2wLf8ppiJ3cer2h/3KB5JhSRbsjhz5sqYNe9D6j/
mx7yrcfyeObxKGhLoGiwcTwmeK1OnCQSgrCkEBjtCTqlqiYvBfXO4vuqBRmpCgZC
0p7cqvGNvtO+OupqNImTb0sNVk8oeVBpqsQzlI5lN2FdA5FRUYtgodT09rPFleX+
PFP+Wo9wV4n1J8KYm8nfpOiSCrPKT9XktsWhAneg6Obzy+LdDM3m2w2/pk+Ja4AO
ThpjdAzyWEhdnTyWWbxeoxsCAwEAAQ==
-----END PUBLIC KEY-----`

const paddleWhitelistIPs = [
  // Production IPs
  '34.232.58.13',
  '34.195.105.136',
  '34.237.3.244',
  // Sandbox IPs
  '34.194.127.46',
  '54.234.237.108',
  '3.208.120.145',
]

@Injectable()
export class WebhookService {
  constructor(
    private readonly logger: AppLoggerService,
  ) { }

  ksort(obj) {
    const keys = Object.keys(obj).sort()
    let sortedObj = {}
    for (let i in keys) {
      sortedObj[keys[i]] = obj[keys[i]]
    }
    return sortedObj
  }

  validateWebhook(jsonObj) {
    // Grab p_signature
    const mySig = Buffer.from(jsonObj.p_signature, 'base64')
    // Remove p_signature from object - not included in array of fields used in verification.
    delete jsonObj.p_signature
    // Need to sort array by key in ascending order
    jsonObj = this.ksort(jsonObj)
    for (let property in jsonObj) {
      if (jsonObj.hasOwnProperty(property) && (typeof jsonObj[property]) !== "string") {
        if (Array.isArray(jsonObj[property])) { // is it an array
          jsonObj[property] = jsonObj[property].toString()
        } else { // if its not an array and not a string, then it is a JSON obj
          jsonObj[property] = JSON.stringify(jsonObj[property])
        }
      }
    }
    // Serialise remaining fields of jsonObj
    const serialized = Serialize.serialize(jsonObj)
    // verify the serialized array against the signature using SHA1 with your public key.
    const verifier = crypto.createVerify('sha1')
    verifier.update(serialized)
    verifier.end()

    const verification = verifier.verify(PADDLE_PUB_KEY, mySig)

    if (!verification) {
      this.logger.error('Webhook signature verification failed.')
      this.logger.error('Check the .env file and enter the correct webhook secret.')
      throw new BadRequestException('Webhook signature verification failed')
    }
  }

  verifyIP(reqIP: string) {
    // TODO
  }
}
