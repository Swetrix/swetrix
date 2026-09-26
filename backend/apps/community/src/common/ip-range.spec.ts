import { isIpInRange, isValidIpRange } from './ip-range'

describe('IP range validation', () => {
  it.each([
    ['203.0.113.42', '203.0.113.42'],
    ['203.0.113.0/24', '203.0.113.42'],
    ['203.0.113.42/32', '203.0.113.42'],
    ['0.0.0.0/0', '203.0.113.42'],
    ['2001:db8::1', '2001:0DB8:0:0:0:0:0:1'],
    ['2001:db8::/64', '2001:db8::42'],
    ['2001:db8::1/128', '2001:db8::1'],
    ['::/0', '2001:db8::42'],
    ['::1', '::1'],
    ['::ffff:203.0.113.42', '203.0.113.42'],
    ['::ffff:203.0.113.0/120', '::ffff:203.0.113.42'],
  ])('accepts %s and matches %s', (range, address) => {
    expect(isValidIpRange(range)).toBe(true)
    expect(isIpInRange(address, range)).toBe(true)
  })

  it.each([
    '',
    '203.0.113.0.24',
    '203/0/113/0/24',
    '203.0.113.256',
    '203.000.113.42',
    '203.0.113.0/33',
    '203.0.113.0/-1',
    '203.0.113.0/24.5',
    '203.0.113.0/',
    '203.0.113.0/24/1',
    '203.0.113.0/24junk',
    '2001:db8::/129',
    '2001:db8::/-1',
    '2001:db8::/',
    '2001:db8::/64/1',
    '2001:db8:::1',
    '::ffff:203.0.113.0/129',
  ])('rejects malformed address or range %s', (range) => {
    expect(isValidIpRange(range)).toBe(false)
  })

  it.each([
    ['203.0.113.0/24', '203.0.114.42'],
    ['2001:db8::/64', '2001:db8:0:1::42'],
    ['2001:db8::1/128', '2001:db8::2'],
  ])('does not match %s against %s', (range, address) => {
    expect(isValidIpRange(range)).toBe(true)
    expect(isIpInRange(address, range)).toBe(false)
  })
})
