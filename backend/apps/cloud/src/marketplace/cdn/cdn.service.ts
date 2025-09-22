import { createReadStream } from 'fs'
import { unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { extname } from 'path'
import { ConfigService } from '@nestjs/config'
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import FormData from 'form-data'
import { HttpService } from '@nestjs/axios'
import { randomUUID } from 'crypto'

@Injectable()
export class CdnService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * To clarify, in this case the file parameter type was set to "any" because
   * Multer from Express returns the "originalname" property,
   * whereas the nestjs-form-data package uses the "originalName" property.
   */
  async uploadFile(file: any): Promise<{ filename: string }> {
    try {
      // Generate a safe filename using UUID to prevent path traversal attacks
      const fileExtension = extname(file.originalName || '')
      const safeFilename = `${randomUUID()}${fileExtension}`
      const filePath = `${tmpdir()}/${safeFilename}`
      await writeFile(filePath, file.buffer)

      const form = new FormData()
      form.append('token', this.configService.get('CDN_ACCESS_TOKEN'))
      form.append('file', createReadStream(filePath))
      const { data } = await this.httpService.axiosRef.post('file', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      await unlink(filePath)
      return data
    } catch (error) {
      console.error(error)
      throw new InternalServerErrorException(
        'Failed to upload extension to the CDN.',
      )
    }
  }

  async deleteFile(filename: string): Promise<void> {
    try {
      await this.httpService.axiosRef.delete(`file`, {
        data: { token: this.configService.get('CDN_ACCESS_TOKEN'), filename },
      })
    } catch (error) {
      console.error(error)
    }
  }
}
