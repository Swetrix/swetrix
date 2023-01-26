import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createReadStream } from 'fs'
import { unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import * as FormData from 'form-data'
import { HttpService } from '@nestjs/axios'

@Injectable()
export class CdnService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async uploadFile(file: Express.Multer.File | Buffer, originalname?: string): Promise<{ filename: string }> {
    try {
      let filePath
      if (file instanceof Buffer) {
        filePath = `${tmpdir()}/${originalname}`
        console.log(filePath)
        await writeFile(filePath, file)
      } else {
        filePath = `${tmpdir()}/${file.originalname}`
        await writeFile(filePath, file.buffer)
      }
      console.log('saved')

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
    }
  }

  async uploadBuffer(buffer: Buffer, originalname: string): Promise<{ filename: string }> {
    try {
      const filePath = `${tmpdir()}/${originalname}`

      const form = new FormData()
      form.append('token', this.configService.get('CDN_ACCESS_TOKEN'))
      form.append('file', buffer, new Date().toISOString() + '.zip')

      const { data } = await this.httpService.axiosRef.post('file', form, {
        headers: {
          'Content-Type':  `multipart/form-data; boundary=${form.getBoundary()}`,
        },
      })

      return data
    } catch (error) {
      console.error(error)
    }
  }

  async deleteFile(filename: string): Promise<void> {
    try {
      await this.httpService.axiosRef.delete(`file/${filename}`, {
        data: { token: this.configService.get('CDN_ACCESS_TOKEN') },
      })
    } catch (error) {
      console.error(error)
    }
  }
}
