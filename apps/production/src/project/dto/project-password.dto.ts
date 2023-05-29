import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator'

export const MAX_PROJECT_PASSWORD_LENGTH = 80

export class ProjectPasswordDto {
  @IsString()
  @MaxLength(MAX_PROJECT_PASSWORD_LENGTH, {
    message: 'Max length is $constraint1 characters',
  })
  @MinLength(1, { message: 'Min length is $constraint1 characters' })
  password?: string | null

  @IsOptional()
  @ValidateIf(o => o.isPasswordProtected !== null)
  isPasswordProtected?: boolean | null
}

export class GetProtectedProjectDto {
  @IsOptional()
  @ValidateIf(o => o.password !== null)
  password?: string | null
}
