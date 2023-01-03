import {
  Controller,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AlertService } from './alert.service'


@ApiTags('Alert')
@Controller('alert')
export class AlertController {
  constructor(
    private readonly alertService: AlertService,
  ) {}

  // TODO: ADD ENDPOINTS TO CREATE / UPDATE / DELETE ALERTS
}
