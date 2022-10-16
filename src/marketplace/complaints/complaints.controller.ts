import { Controller } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('complaints')
@Controller('complaints')
export class ComplaintsController {}
