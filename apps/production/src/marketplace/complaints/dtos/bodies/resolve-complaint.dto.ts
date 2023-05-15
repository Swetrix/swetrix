import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsString } from 'class-validator'
import { ComplaintStatus } from '../../enums/complaint-status.enum'

export class ResolveComplaintBodyDto {
  @ApiProperty()
  @IsString()
  reply: string | null

  @ApiProperty({
    enum: ComplaintStatus,
  })
  @IsEnum(ComplaintStatus)
  status: ComplaintStatus
}
