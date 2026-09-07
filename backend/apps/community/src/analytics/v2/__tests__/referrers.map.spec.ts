import fs from 'fs'
import path from 'path'

import { getDomainsForRefName } from '../../utils/referrers.map'

describe('referrers map', () => {
  it('resolves canonical referrer names case-insensitively', () => {
    const google = getDomainsForRefName('Google')
    expect(google).toContain('google.com')
    expect(getDomainsForRefName('google')).toEqual(google)
    expect(getDomainsForRefName('hypermonkey.tech')).toBeNull()
  })

  it('keeps both backend copies in sync with the web map', () => {
    const files = [
      path.resolve(__dirname, '../../utils/referrers.map.json'),
      path.resolve(
        __dirname,
        '../../../../../cloud/src/analytics/utils/referrers.map.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../../../web/app/referrers.map.json',
      ),
    ]
    const maps = files.map((file) => fs.readFileSync(file, 'utf8'))

    expect(new Set(maps).size).toBe(1)
  })
})
