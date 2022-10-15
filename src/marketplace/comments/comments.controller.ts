import { Controller } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('comments')
@Controller('comments')
export class CommentsController {}
