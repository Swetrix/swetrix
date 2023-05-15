import { Injectable } from '@nestjs/common'
import { PaginationOptionsInterface } from 'src/common/pagination/pagination.options.interface'
import { LetterTemplate } from 'src/mailer/letter'
import { Project } from 'src/project/entity/project.entity'
import { User, UserType } from 'src/user/entities/user.entity'
import { ProjectShare } from '../project/entity/project-share.entity'
import { ProjectDTO } from '../project/dto/project.dto'

@Injectable()
export class Util {
  getString(): string {
    return 'testString'
  }

  getUser(): User {
    const user = new User()
    return user
  }

  getLetterTemplate(): LetterTemplate {
    const letterTemplate = LetterTemplate.ConfirmPasswordChange
    return letterTemplate
  }

  getProject(): Project {
    const proj = new Project()
    return proj
  }

  getUserType(): UserType {
    const userType = UserType.CUSTOMER
    return userType
  }

  getUserTypeArray(): Array<UserType> {
    const arrayOfUserType = new Array<UserType>()
    arrayOfUserType.push(this.getUserType())
    return arrayOfUserType
  }

  getProjectShare(): ProjectShare {
    const projectShare = new ProjectShare()
    return projectShare
  }

  getObjectArray(): Array<object> {
    const arrayOfObjects = new Array<object>()
    return arrayOfObjects
  }

  getStringArray(): Array<string> {
    const arrayOfSrtings = new Array<string>()
    return arrayOfSrtings
  }

  getObject(): object {
    const object = {}
    return object
  }

  getRecordStringUnknown(): Record<string, unknown> {
    const record: Record<string, unknown> = {}
    return record
  }

  getPaginationOptionsInterface(): PaginationOptionsInterface {
    const paginationOptionsInterface: PaginationOptionsInterface = {
      take: 1,
      skip: 2,
    }
    return paginationOptionsInterface
  }

  getProjectDTO(): ProjectDTO {
    const projectDTO = new ProjectDTO()
    return projectDTO
  }
}
