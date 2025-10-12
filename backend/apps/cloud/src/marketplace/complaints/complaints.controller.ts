import {
  Body,
  Controller,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common'
import { ApiQuery, ApiTags } from '@nestjs/swagger'
import { UserService } from '../../user/user.service'
import { ExtensionsService } from '../extensions/extensions.service'
import { ComplaintsService } from './complaints.service'
import { CreateComplaintBodyDto } from './dtos/bodies/create-complaint.dto'
import { CreateComplaintQueryDto } from './dtos/queries/create-complaint.dto'
import { Complaint } from './entities/complaint.entity'

@ApiTags('complaints')
@Controller('complaints')
export class ComplaintsController {
  constructor(
    private readonly complaintsService: ComplaintsService,
    private readonly userService: UserService,
    private readonly extensionsService: ExtensionsService,
  ) {}

  @Post()
  @ApiQuery({ name: 'userId', required: true, type: String })
  async createComplaint(
    @Query() queries: CreateComplaintQueryDto,
    @Body() body: CreateComplaintBodyDto,
  ): Promise<Complaint> {
    const user = await this.userService.findOne({
      where: { id: queries.userId },
    })

    if (!user) {
      throw new NotFoundException('User not found.')
    }

    const extension = await this.extensionsService.findOne({
      where: { id: body.extensionId.toString() },
    })

    if (!extension) {
      throw new NotFoundException('Extension not found.')
    }

    return this.complaintsService.save({
      ...body,
      userId: Number(queries.userId),
      extensionId: Number(body.extensionId),
    })
  }
}
