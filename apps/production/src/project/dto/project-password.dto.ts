import { IsOptional, Matches, ValidateIf } from 'class-validator'

export class ProjectPasswordDto {
  @IsOptional()
  @ValidateIf(o => o.password !== null)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[a-zA-Z\d!@#$%^&*]{8,72}$/,
    {
      message:
        'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character (!@#$%^&*).',
    },
  )
  password?: string | null

  @IsOptional()
  @ValidateIf(o => o.isPasswordProtected !== null)
  isPasswordProtected?: boolean | null
}
