import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'

@Injectable()
export class BodyValidationPipe implements PipeTransform {
  transform(value: any) {
    if (Object.keys(value).length === 0) {
      throw new BadRequestException('The body cannot be empty.')
    }

    return value
  }
}
