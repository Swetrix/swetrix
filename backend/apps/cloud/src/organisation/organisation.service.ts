import { Injectable, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  Repository,
} from 'typeorm'
import { find as _find } from 'lodash'

import { Organisation } from './entity/organisation.entity'
import {
  OrganisationMember,
  OrganisationRole,
} from './entity/organisation-member.entity'
import { Pagination, PaginationOptionsInterface } from '../common/pagination'
import { getRedisProjectKey, redis } from '../common/constants'

@Injectable()
export class OrganisationService {
  constructor(
    @InjectRepository(Organisation)
    private organisationRepository: Repository<Organisation>,
    @InjectRepository(OrganisationMember)
    private membershipRepository: Repository<OrganisationMember>,
  ) {}

  async create(data: Partial<Organisation>) {
    const org = this.organisationRepository.create(data)
    return this.organisationRepository.save(org)
  }

  async update(id: string, data: Partial<Organisation>) {
    return this.organisationRepository.update(id, data)
  }

  async findOne(options: FindOneOptions<Organisation>) {
    return this.organisationRepository.findOne(options)
  }

  async find(options: FindManyOptions<Organisation>) {
    return this.organisationRepository.find(options)
  }

  async delete(id: string) {
    return this.organisationRepository.delete(id)
  }

  async deleteMemberships(options: FindOptionsWhere<OrganisationMember>) {
    return this.membershipRepository.delete(options)
  }

  async findMemberships(options: FindManyOptions<OrganisationMember>) {
    return this.membershipRepository.find(options)
  }

  async createMembership(data: Partial<OrganisationMember>) {
    const membership = this.membershipRepository.create(data)
    return this.membershipRepository.save(membership)
  }

  async findOneMembership(options: FindOneOptions<OrganisationMember>) {
    return this.membershipRepository.findOne(options)
  }

  async updateMembership(id: string, data: Partial<OrganisationMember>) {
    await this.membershipRepository.update(id, data)
    return this.findOneMembership({ where: { id } })
  }

  async deleteMembership(id: string) {
    await this.membershipRepository.delete(id)
  }

  async deleteOrganisationProjectsFromRedis(organisationId: string) {
    const organisation = await this.findOne({
      where: { id: organisationId },
      relations: ['projects'],
      select: {
        id: true,
        projects: {
          id: true,
        },
      },
    })

    if (!organisation?.projects?.length) {
      return
    }

    for (const project of organisation.projects) {
      if (!project?.id) {
        continue
      }

      const key = getRedisProjectKey(project.id)

      try {
        await redis.del(key)
      } catch (reason) {
        console.error(
          `Error deleting project ${project.id} from redis: ${reason}`,
        )
      }
    }
  }

  validateManageAccess(organisation: Organisation, userId: string) {
    const membership = _find(
      organisation.members,
      member => member.user?.id === userId,
    )

    if (!membership || membership.role === OrganisationRole.viewer) {
      throw new ForbiddenException(
        'You do not have permission to manage this organisation',
      )
    }
  }

  async canManageOrganisation(organisationId: string, userId: string) {
    const organisation = await this.findOne({
      where: { id: organisationId },
      relations: ['members', 'members.user'],
    })

    if (!organisation) {
      return false
    }

    try {
      this.validateManageAccess(organisation, userId)
      return true
    } catch {
      return false
    }
  }

  async isOrganisationOwner(organisationId: string, userId: string) {
    const ownerMembership = await this.findOneMembership({
      where: {
        organisation: { id: organisationId },
        role: OrganisationRole.owner,
        user: { id: userId },
      },
    })

    return !!ownerMembership
  }

  async getOrganisationOwner(organisationId: string) {
    const ownerMembership = await this.findOneMembership({
      where: {
        organisation: { id: organisationId },
        role: OrganisationRole.owner,
      },
      relations: ['user'],
    })

    if (!ownerMembership) {
      throw new ForbiddenException('Organisation owner not found')
    }

    return ownerMembership.user
  }

  async paginate(
    options: PaginationOptionsInterface,
    userId: string,
    search?: string,
  ) {
    const queryBuilder = this.organisationRepository
      .createQueryBuilder('organisation')
      // We do left join twice to avoid the issue with TypeORM where it does not return
      // all the relations when filtering by one of them
      // see: https://github.com/typeorm/typeorm/issues/3731
      .leftJoin('organisation.members', 'membersFilter')
      .leftJoin('membersFilter.user', 'userFilter')
      .leftJoinAndSelect('organisation.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .select([
        'organisation.id',
        'organisation.name',
        'members.id',
        'members.role',
        'members.confirmed',
        'members.created',
        'user.email',
      ])
      .orderBy('organisation.name', 'ASC')
      .take(options.take || 100)
      .skip(options.skip || 0)

    if (userId) {
      queryBuilder.andWhere('userFilter.id = :userId', {
        userId,
      })
    }

    if (search) {
      queryBuilder.andWhere('LOWER(organisation.name) LIKE LOWER(:search)', {
        search: `%${search.trim()}%`,
      })
    }

    const [results, total] = await queryBuilder.getManyAndCount()

    return new Pagination<Organisation>({
      results,
      total,
    })
  }
}
