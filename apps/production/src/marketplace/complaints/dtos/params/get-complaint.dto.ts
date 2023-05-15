import { IsNumberString } from 'class-validator'

export class GetComplaintParamDto {
  @IsNumberString()
  complaintId: string
}
