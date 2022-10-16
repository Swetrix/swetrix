import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common'
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { ComplaintsService } from './complaints.service'
import { GetComplaintParamDto } from './dtos/params/get-complaint.dto'
import { GetComplaintsQueryDto } from './dtos/queries/get-complaints.dto'
import { Complaint } from './entities/complaint.entity'

@ApiTags('complaints')
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  // In the future, it will be added to use only for admin.
  @Get()
  @ApiQuery({ name: 'offset', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'extensionId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  async getComplaints(@Query() queries: GetComplaintsQueryDto): Promise<{
    complaints: Complaint[]
    count: number
  }> {
    const [complaints, count] = await this.complaintsService.findAndCount({
      where: {
        ...(queries.extensionId && { extensionId: queries.extensionId }),
        ...(queries.userId && { userId: queries.userId }),
      },
      skip: queries.offset || 0,
      take: queries.limit || 25,
    })

    return { complaints, count }
  }

  // In the future, it will be added to use only for admin.
  @Get(':complaintId')
  @ApiParam({ name: 'complaintId', required: true, type: String })
  async getComplaint(
    @Param() params: GetComplaintParamDto,
  ): Promise<Complaint> {
    const complaint = await this.complaintsService.findOne({
      where: { id: params.complaintId },
    })

    if (!complaint) {
      throw new NotFoundException('Complaint not found.')
    }

    return complaint
  }
}
