import { IsNumberString } from 'class-validator'

export class ResolveComplaintParamDto {
  @IsNumberString()
  complaintId: string
}
