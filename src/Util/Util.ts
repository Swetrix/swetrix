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
    let user = new User()
    return user
  }

  getLetterTemplate(): LetterTemplate {
    let letterTemplate = LetterTemplate.ConfirmPasswordChange
    return letterTemplate
  }

  getProject(): Project {
    let proj = new Project()
    return proj
  }

  getUserType(): UserType {
    let userType = UserType.CUSTOMER
    return userType
  }

  getUserTypeArray(): Array<UserType> {
    let arrayOfUserType = new Array<UserType>()
    arrayOfUserType.push(this.getUserType())
    return arrayOfUserType
  }

  getProjectShare(): ProjectShare {
    let projectShare = new ProjectShare()
    return projectShare
  }

  getObjectArray(): Array<Object> {
    let arrayOfObjects = new Array<Object>()
    return arrayOfObjects
  }

  getStringArray(): Array<string> {
    let arrayOfSrtings = new Array<string>()
    return arrayOfSrtings
  }

  getObject(): Object {
    let object = new Object()
    return object
  }

  getRecordStringUnknown(): Record<string, unknown> {
    let record: Record<string, unknown> = {}
    return record
  }

  getPaginationOptionsInterface(): PaginationOptionsInterface {
    let paginationOptionsInterface: PaginationOptionsInterface = {
      take: 1,
      skip: 2,
    }
    return paginationOptionsInterface
  }

  getProjectDTO(): ProjectDTO {
    let projectDTO = new ProjectDTO()
    return projectDTO
  }
}
