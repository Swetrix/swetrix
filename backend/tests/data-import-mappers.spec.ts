import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { zipSync, strToU8 } from 'fflate'
import { PlausibleMapper as CloudPlausible } from '../apps/cloud/src/data-import/mappers/plausible.mapper'
import { PlausibleMapper as CommunityPlausible } from '../apps/community/src/data-import/mappers/plausible.mapper'
import { FathomMapper as CloudFathom } from '../apps/cloud/src/data-import/mappers/fathom.mapper'
import { FathomMapper as CommunityFathom } from '../apps/community/src/data-import/mappers/fathom.mapper'
import { SimpleAnalyticsMapper as CloudSimple } from '../apps/cloud/src/data-import/mappers/simple-analytics.mapper'
import { SimpleAnalyticsMapper as CommunitySimple } from '../apps/community/src/data-import/mappers/simple-analytics.mapper'
import { UmamiMapper as CloudUmami } from '../apps/cloud/src/data-import/mappers/umami.mapper'
import { UmamiMapper as CommunityUmami } from '../apps/community/src/data-import/mappers/umami.mapper'

const visitors =
  'date,visitors,pageviews,bounces,visits,visit_duration\n2024-01-01,2,5,0,2,30\n'
const collect = async (stream: AsyncIterable<any>) => {
  const rows = []
  for await (const row of stream) rows.push(row)
  return rows
}
let directory: string
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'import-test-'))
})
afterEach(() => {
  fs.rmSync(directory, { recursive: true, force: true })
})
function archive(files: Record<string, string>, level: 0 | 6 = 6) {
  const file = path.join(directory, 'export.zip')
  fs.writeFileSync(
    file,
    zipSync(
      Object.fromEntries(
        Object.entries(files).map(([name, data]) => [name, strToU8(data)]),
      ),
      { level },
    ),
  )
  return file
}

describe.each([
  ['cloud', CloudPlausible, CloudFathom, CloudSimple, CloudUmami],
  [
    'community',
    CommunityPlausible,
    CommunityFathom,
    CommunitySimple,
    CommunityUmami,
  ],
] as const)('%s imports', (_edition, Plausible, Fathom, Simple, Umami) => {
  it('imports all Plausible chunks, pageviews, dimensions and custom events', async () => {
    const file = archive({
      'export/imported_visitors_20240101_20240101.csv': visitors,
      'export/imported_visitors_20240102_20240102.csv': visitors.replaceAll(
        '2024-01-01',
        '2024-01-02',
      ),
      'imported_pages.csv':
        'date,hostname,page,pageviews\n2024-01-01,example.com,/a,5\n2024-01-02,example.com,/b,5\n',
      'imported_browsers.csv':
        'date,browser,browser_version,visits\n2024-01-01,Chrome,120,2\n',
      'imported_devices.csv': 'date,device,visits\n2024-01-01,Mobile,2\n',
      'imported_custom_events.csv': 'date,name,events\n2024-01-01,Signup,3\n',
    })
    const rows = await collect(
      new Plausible().createRowStream(file, 'testproject1', 7),
    )
    expect(rows.filter((row) => row.type === 'pageview')).toHaveLength(10)
    expect(rows.filter((row) => row.type === 'custom_event')).toHaveLength(3)
    expect(rows.find((row) => row.data.pg === '/a').data.br).toBe(
      'Mobile Chrome',
    )
    expect(rows.some((row) => row.data.pg === '/b')).toBe(true)
    expect(rows.every((row) => row.data.importID === 7)).toBe(true)
  })

  it('handles a 57 MiB ZIP containing a CSV above the former 50 MiB limit', async () => {
    const padding = 'x'.repeat(2000)
    const record = `2024-01-01,example.com,/large,1,${padding}\n`
    const count = Math.ceil((57 * 1024 * 1024) / Buffer.byteLength(record))
    const file = archive(
      {
        'imported_visitors.csv': visitors,
        'imported_pages.csv': `date,hostname,page,pageviews,unused\n${record.repeat(count)}`,
      },
      0,
    )
    expect(fs.statSync(file).size).toBeGreaterThan(57 * 1024 * 1024)
    let timerRan = false
    const timer = setTimeout(() => {
      timerRan = true
    }, 0)
    try {
      const rows = await collect(
        new Plausible().createRowStream(file, 'testproject1', 1),
      )
      expect(rows).toHaveLength(5)
      expect(rows.every((row) => row.data.pg === '/large')).toBe(true)
      expect(timerRan).toBe(true)
    } finally {
      clearTimeout(timer)
    }
  })

  it('rejects unsupported ZIP contents and malformed CSV headers', async () => {
    await expect(
      collect(
        new Plausible().createRowStream(
          archive({ 'visitors.csv': visitors }),
          'testproject1',
          1,
        ),
      ),
    ).rejects.toThrow('imported_visitors')
    await expect(
      collect(
        new Plausible().createRowStream(
          archive({ 'imported_visitors.csv': 'date,wrong\n2024-01-01,1\n' }),
          'testproject1',
          1,
        ),
      ),
    ).rejects.toThrow('missing columns')
  })

  it('rejects truncated archives, excessive declared expansion, and invalid counts', async () => {
    const file = archive({ 'imported_visitors.csv': visitors })
    const bytes = fs.readFileSync(file)
    fs.writeFileSync(file, bytes.subarray(0, 60))
    await expect(
      collect(new Plausible().createRowStream(file, 'testproject1', 1)),
    ).rejects.toThrow()
    bytes.writeUInt32LE(2 * 1024 * 1024 * 1024 + 1, 22)
    fs.writeFileSync(file, bytes)
    await expect(
      collect(new Plausible().createRowStream(file, 'testproject1', 1)),
    ).rejects.toThrow('2 GiB')
    archive({
      'imported_visitors.csv': visitors.replace(',2,5,0,2,30', ',2,5.5,0,2,30'),
    })
    await expect(
      collect(new Plausible().createRowStream(file, 'testproject1', 1)),
    ).rejects.toThrow('invalid numeric')
  })

  it('rejects daily counts over the limits instead of silently truncating', async () => {
    const file = archive({
      'imported_visitors.csv': visitors.replace(
        ',2,5,0,2,30',
        ',2,5,0,1000001,30',
      ),
    })
    await expect(
      collect(new Plausible().createRowStream(file, 'testproject1', 1)),
    ).rejects.toThrow('daily event processing limits')
  })

  it('preserves days with custom events but no pageviews or visits', async () => {
    const file = archive({
      'imported_visitors.csv': visitors.replace(',2,5,0,2,30', ',1,0,0,0,0'),
      'imported_custom_events.csv': 'date,name,events\n2024-01-01,Signup,3\n',
    })
    const rows = await collect(
      new Plausible().createRowStream(file, 'testproject1', 1),
    )
    expect(rows).toHaveLength(3)
    expect(rows.every((row) => row.type === 'custom_event')).toBe(true)
  })

  it('cleans Plausible temporary files when the consumer stops or parsing fails', async () => {
    const cleanup = jest.spyOn(fs.promises, 'rm')
    const file = archive({ 'imported_visitors.csv': visitors })
    const rows = new Plausible().createRowStream(file, 'testproject1', 1)
    const stream = rows[Symbol.asyncIterator]()
    await stream.next()
    await stream.return!()
    expect(cleanup).toHaveBeenCalledWith(
      expect.stringContaining('swetrix-plausible-'),
      { recursive: true, force: true },
    )
    cleanup.mockClear()
    await expect(
      collect(
        new Plausible().createRowStream(
          archive({ 'bad.csv': 'invalid' }),
          'testproject1',
          1,
        ),
      ),
    ).rejects.toThrow()
    expect(cleanup).toHaveBeenCalled()
    cleanup.mockRestore()
  })

  it('reports missing CSV files without an unhandled stream error', async () => {
    for (const Mapper of [Fathom, Simple]) {
      await expect(
        collect(
          new Mapper().createRowStream(
            path.join(directory, 'missing.csv'),
            'testproject1',
            1,
          ),
        ),
      ).rejects.toThrow('Could not read')
    }
  })

  it('streams Fathom counts and Simple Analytics raw events', async () => {
    const file = path.join(directory, 'export.csv')
    fs.writeFileSync(
      file,
      'datetime,hostname,pathname,pageviews\n2024-01-01 00:00:00,example.com,/,3\n',
    )
    expect(
      await collect(new Fathom().createRowStream(file, 'testproject1', 1)),
    ).toHaveLength(3)
    fs.writeFileSync(
      file,
      'added_iso,datapoint,session_id,path\n2024-01-01T00:00:00Z,pageview,s1,/\n2024-01-01T00:01:00Z,Signup,s1,/\n',
    )
    const rows = await collect(
      new Simple().createRowStream(file, 'testproject1', 1),
    )
    expect(rows.map((row) => row.type)).toEqual(['pageview', 'custom_event'])
  })

  it('imports Umami BOM CSV and reports invalid ZIPs', async () => {
    const file = archive({
      'session.csv': 'ignored\n'.repeat(10000),
      'website_event.csv':
        '\uFEFFsession_id,created_at,event_type,url_path\ns1,2024-01-01 00:00:00,1,/\n',
    })
    expect(
      await collect(new Umami().createRowStream(file, 'testproject1', 1)),
    ).toHaveLength(1)
    fs.writeFileSync(file, 'invalid')
    await expect(
      collect(new Umami().createRowStream(file, 'testproject1', 1)),
    ).rejects.toThrow()
  })
})
