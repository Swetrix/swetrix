import * as cloud from '../apps/cloud/src/project/tracking-settings'
import * as community from '../apps/community/src/project/tracking-settings'

describe.each([cloud, community])('managed tracking settings', (tracker) => {
  const defaults = {
    pageviews: true,
    outboundLinks: false,
    errors: false,
    sessionReplay: false,
  }

  it('defaults existing projects to pageviews only', () => {
    for (const legacyValue of [null, undefined, '{}']) {
      expect(tracker.readTrackingSettings(legacyValue)).toEqual(defaults)
    }
  })

  it('exposes only allowlisted booleans and caps unavailable recording', () => {
    const requested = {
      pageviews: false,
      outboundLinks: true,
      errors: true,
      sessionReplay: true,
    }
    const stored = {
      ...requested,
      apiURL: 'https://unexpected.example',
      secret: 'private',
    }
    for (const storageFormat of [stored, JSON.stringify(stored)]) {
      expect(tracker.readTrackingSettings(storageFormat)).toEqual(requested)
      expect(tracker.readTrackingSettings(storageFormat, false)).toEqual({
        ...requested,
        sessionReplay: false,
      })
    }
  })

  it('accepts partial boolean updates and rejects non-boolean or unknown fields', () => {
    expect(tracker.isValidTrackingSettings({ errors: false })).toBe(true)
    for (const invalid of [
      null,
      [],
      'true',
      { sessionReplay: 1 },
      { pageviews: null },
      { constructor: false },
      { apiURL: 'x' },
    ]) {
      expect(tracker.isValidTrackingSettings(invalid)).toBe(false)
    }
  })
})
