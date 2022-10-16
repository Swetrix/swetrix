import { Controller, Get, Query } from '@nestjs/common'
import { ApiQuery, ApiTags } from '@nestjs/swagger'
import { ComplaintsService } from './complaints.service'
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
}
