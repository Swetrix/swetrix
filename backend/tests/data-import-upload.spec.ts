import * as fs from 'fs'
import { PassThrough, Readable } from 'stream'
import multer from 'multer'

for (const edition of ['cloud', 'community']) {
  describe(`${edition} multipart upload limit`, () => {
    const root = `../apps/${edition}/src`
    let options: multer.Options
    jest.resetModules()
    jest.doMock('@nestjs/platform-express', () => ({
      FileInterceptor: (_field, config) => {
        options = config
        return class {}
      },
    }))
    jest.doMock(`${root}/project/project.service`, () => ({
      ProjectService: class {},
    }))
    jest.doMock(`${root}/data-import/data-import.service`, () => ({
      DataImportService: class {},
    }))
    jest.doMock(`${root}/data-import/ga4-import.service`, () => ({
      Ga4ImportService: class {},
    }))
    jest.doMock(`${root}/data-import/data-import.processor`, () => ({
      DATA_IMPORT_QUEUE: 'data-import',
    }))
    jest.doMock(`${root}/data-import/mappers`, () => ({
      SUPPORTED_PROVIDERS: ['plausible'],
      getMapper: jest.fn(),
    }))
    jest.doMock(`${root}/auth/decorators`, () => ({ Auth: () => () => {} }))
    jest.doMock(`${root}/common/utils`, () => ({ getIPFromHeaders: jest.fn() }))
    if (edition === 'cloud') {
      jest.doMock(`${root}/auth/guards/authentication.guard`, () => ({
        AuthenticationGuard: class {},
      }))
      jest.doMock(`${root}/api-key/api-key-access.decorator`, () => ({
        ApiKeyAccess: () => () => {},
      }))
      jest.doMock(`${root}/common/analytics`, () => ({
        trackCustom: jest.fn(),
      }))
    }
    const { DataImportController } = require(
      `${root}/data-import/data-import.controller`,
    )
    it('removes the pending GA4 record when the connection token has expired', async () => {
      const error = new Error('Expired connection token')
      const imports = {
        create: jest.fn().mockResolvedValue({ id: 10 }),
        deleteImportRecord: jest.fn(),
      }
      const projects = { getFullProject: jest.fn(), allowedToManage: jest.fn() }
      const ga4 = { consumeTokenForImport: jest.fn().mockRejectedValue(error) }
      const queue = { add: jest.fn() }
      const controller = new DataImportController(imports, projects, ga4, queue)
      await expect(
        controller.ga4Start(
          'testproject1',
          'user',
          { propertyId: '123' },
          {},
          '127.0.0.1',
        ),
      ).rejects.toThrow(error)
      expect(imports.deleteImportRecord).toHaveBeenCalledWith(
        ...(edition === 'cloud' ? [10] : ['testproject1', 10]),
      )
      expect(queue.add).not.toHaveBeenCalled()
    })
    it.each([57 * 1024 * 1024, 100 * 1024 * 1024, 100 * 1024 * 1024 + 1])(
      'handles a %i-byte file through the configured Multer middleware',
      async (size) => {
        const boundary = 'swetrix-import-test-boundary'
        const prefix = Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="export.zip"\r\nContent-Type: application/zip\r\n\r\n`,
        )
        const suffix = Buffer.from(`\r\n--${boundary}--\r\n`)
        const request = new PassThrough() as any
        request.headers = {
          'content-type': `multipart/form-data; boundary=${boundary}`,
          'content-length': String(prefix.length + size + suffix.length),
        }
        request.method = 'POST'
        const finished = new Promise<Error | undefined>((resolve) => {
          multer(options).single('file')(request, {} as any, (error) =>
            resolve(error),
          )
        })
        const chunk = Buffer.alloc(1024 * 1024)
        const source = Readable.from(
          (function* () {
            yield prefix
            for (let remaining = size; remaining > 0; remaining -= chunk.length)
              yield chunk.subarray(0, Math.min(chunk.length, remaining))
            yield suffix
          })(),
        )
        source.pipe(request)
        const error = await finished
        try {
          if (size <= 100 * 1024 * 1024) {
            expect(error).toBeUndefined()
            expect(request.file.size).toBe(size)
            expect(fs.statSync(request.file.path).size).toBe(size)
          } else {
            expect(error).toMatchObject({ code: 'LIMIT_FILE_SIZE' })
            expect(request.file).toBeUndefined()
          }
        } finally {
          if (request.file) fs.rmSync(request.file.path, { force: true })
          source.destroy()
          request.destroy()
        }
      },
    )
  })
}
