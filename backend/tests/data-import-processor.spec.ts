import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { randomUUID } from 'crypto'

for (const edition of ['cloud', 'community']) {
  describe(`${edition} import processor`, () => {
    const root = `../apps/${edition}/src`
    const insert = jest.fn()
    const getMapper = jest.fn()
    jest.doMock(`${root}/common/integrations/clickhouse`, () => ({
      clickhouse: { insert },
    }))
    jest.doMock(`${root}/data-import/mappers`, () => ({ getMapper }))
    jest.doMock(`${root}/data-import/data-import.service`, () => ({
      DataImportService: class {},
    }))
    jest.doMock(`${root}/data-import/entity/data-import.entity`, () => ({
      DataImportStatus: { COMPLETED: 'completed', PROCESSING: 'processing' },
    }))
    if (edition === 'cloud')
      jest.doMock(`${root}/common/analytics`, () => ({
        trackCustom: jest.fn(),
      }))
    const { DataImportProcessor } = require(
      `${root}/data-import/data-import.processor`,
    )
    const service = {
      findById: jest.fn(),
      findOne: jest.fn(),
      markProcessing: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
      cleanupImportedRows: jest.fn(),
    }
    let fileName: string
    let filePath: string
    let job: any
    beforeEach(() => {
      jest.clearAllMocks()
      insert.mockResolvedValue({})
      service.findById.mockResolvedValue({ status: 'pending' })
      service.findOne.mockResolvedValue({ status: 'pending' })
      fileName = `test-${randomUUID()}.csv`
      filePath = path.join(os.tmpdir(), 'swetrix-imports', fileName)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, '')
      job = {
        data: {
          id: 10,
          importId: 2,
          projectId: 'testproject1',
          provider: 'simple-analytics',
          fileName,
        },
        updateProgress: jest.fn(),
      }
    })
    afterEach(() => {
      fs.rmSync(filePath, { force: true })
    })
    function rows(count: number) {
      getMapper.mockReturnValue({
        createRowStream: async function* () {
          for (let i = 0; i < count; i++)
            yield {
              type: 'pageview',
              data: { created: '2024-01-01 00:00:00', importID: 2 },
            }
        },
      })
    }
    it('writes batches of 5000, flushes the remainder, and cleans the upload', async () => {
      rows(5001)
      const sizes: number[] = []
      insert.mockImplementation(async ({ values }) => {
        sizes.push(values.length)
      })
      await new DataImportProcessor(service).process(job)
      expect(sizes).toEqual([5000, 1])
      expect(service.markCompleted).toHaveBeenCalledWith(
        ...(edition === 'cloud' ? [10] : [2, 'testproject1']),
        expect.objectContaining({ importedRows: 5001, totalRows: 5001 }),
      )
      expect(service.markFailed).not.toHaveBeenCalled()
      expect(fs.existsSync(filePath)).toBe(false)
    })
    it('rolls back partial data and reports a failed insert', async () => {
      rows(5001)
      insert.mockRejectedValueOnce(new Error('database unavailable'))
      await new DataImportProcessor(service).process(job)
      expect(service.cleanupImportedRows).toHaveBeenCalledWith(
        'testproject1',
        2,
      )
      expect(service.markFailed).toHaveBeenCalled()
      expect(service.markCompleted).not.toHaveBeenCalled()
      expect(fs.existsSync(filePath)).toBe(false)
    })
    it('reports an empty or incompatible export instead of successful zero-row import', async () => {
      rows(0)
      await new DataImportProcessor(service).process(job)
      expect(service.markFailed).toHaveBeenCalledWith(
        ...(edition === 'cloud' ? [10] : [2, 'testproject1']),
        expect.stringContaining('no importable events'),
      )
      expect(service.markCompleted).not.toHaveBeenCalled()
    })
  })
}
