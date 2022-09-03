import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class CdnService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  deleteFile(filename: string): void {
    this.httpService.delete('file', {
      data: { token: this.configService.get('CDN_ACCESS_TOKEN'), filename },
    })
  }
}
