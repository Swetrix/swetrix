import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, Matches, IsIn } from 'class-validator'
import { PID_REGEX } from '../../common/constants'

export class GetVersionFiltersDto {
  @ApiProperty({
    example: 'aUn1quEid-3',
    required: true,
    description: 'The project ID',
  })
  @IsNotEmpty()
  @Matches(PID_REGEX, { message: 'The provided Project ID (pid) is incorrect' })
  pid: string

  @ApiProperty({
    example: 'traffic',
    required: true,
    description: 'Data type: traffic or errors',
    enum: ['traffic', 'errors'],
  })
  @IsNotEmpty()
  @IsIn(['traffic', 'errors'], {
    message: 'type must be either traffic or errors',
  })
  type: 'traffic' | 'errors'

  @ApiProperty({
    example: 'br',
    required: true,
    description: 'Column type: br (browser) or os',
    enum: ['br', 'os'],
  })
  @IsNotEmpty()
  @IsIn(['br', 'os'], {
    message: 'column must be either br or os',
  })
  column: 'br' | 'os'
}
