import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository, IsNull, Not } from 'typeorm'
import { randomBytes } from 'crypto'

import {
  NotificationChannel,
  NotificationChannelType,
  NotificationChannelConfig,
} from './entity/notification-channel.entity'
import { ProjectService } from '../project/project.service'
import { OrganisationService } from '../organisation/organisation.service'
import { OrganisationRole } from '../organisation/entity/organisation-member.entity'
import {
  CreateChannelDTO,
  UpdateChannelDTO,
} from './dto/notification-channel.dto'
import { WebhookChannelService } from './dispatchers/webhook-channel.service'

const MAX_CHANNELS_PER_SCOPE = 50
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isValidHttpsUrl = (url: string, allowedHostSuffix: string[] = []) => {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    if (allowedHostSuffix.length === 0) return true
    const host = u.hostname.toLowerCase()
    return allowedHostSuffix.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    )
  } catch {
    return false
  }
}

@Injectable()
export class NotificationChannelService {
  constructor(
    @InjectRepository(NotificationChannel)
    private readonly channelRepository: Repository<NotificationChannel>,
    private readonly projectService: ProjectService,
    private readonly organisationService: OrganisationService,
  ) {}

  // --- Scope helpers --------------------------------------------------------

  /** All channel ids visible to the caller across user/orgs/projects. */
  async getVisibleChannels(userId: string): Promise<NotificationChannel[]> {
    const [
      userOwned,
      ownedProjectChannels,
      orgChannels,
      sharedProjectChannels,
    ] = await Promise.all([
      this.channelRepository.find({ where: { user: { id: userId } } }),
      this.getProjectChannelsForUserOwnedProjects(userId),
      this.getOrgChannelsForUserMemberships(userId),
      this.getSharedProjectChannels(userId),
    ])

    const map = new Map<string, NotificationChannel>()
    for (const c of [
      ...userOwned,
      ...ownedProjectChannels,
      ...orgChannels,
      ...sharedProjectChannels,
    ]) {
      map.set(c.id, c)
    }
    return Array.from(map.values())
  }

  private async getProjectChannelsForUserOwnedProjects(userId: string) {
    const pids = await this.projectService.getProjectIdsByAdminId(userId)
    if (pids.length === 0) return []
    return this.channelRepository.find({
      where: { project: { id: In(pids) } },
    })
  }

  private async getOrgChannelsForUserMemberships(userId: string) {
    const memberships = await this.organisationService.findMemberships({
      where: { user: { id: userId }, confirmed: true },
      relations: ['organisation'],
    })
    const orgIds = memberships
      .map((m) => m.organisation?.id)
      .filter((id): id is string => !!id)
    if (orgIds.length === 0) return []
    return this.channelRepository.find({
      where: { organisation: { id: In(orgIds) } },
    })
  }

  private async getSharedProjectChannels(userId: string) {
    // Channels owned by projects the user has admin share / org membership on.
    // We resolve through the existing projectService permission code.
    const allProjectChannels = await this.channelRepository.find({
      where: { project: Not(IsNull()) },
      relations: ['project'],
    })
    if (allProjectChannels.length === 0) return []
    const accessible: NotificationChannel[] = []
    for (const channel of allProjectChannels) {
      if (!channel.project) continue
      const project = await this.projectService.getFullProject(
        channel.project.id,
      )
      if (!project) continue
      try {
        this.projectService.allowedToView(project, userId)
        accessible.push(channel)
      } catch {
        // ignore — not allowed
      }
    }
    return accessible
  }

  /** Channels usable on a given project (project-owned + project owner's user channels + project's organisation channels). */
  async getChannelsForProject(
    projectId: string,
    userId: string,
  ): Promise<NotificationChannel[]> {
    const project = await this.projectService.getFullProject(projectId)
    if (!project) throw new NotFoundException('Project not found')
    this.projectService.allowedToView(project, userId)

    const candidates: NotificationChannel[] = []

    const projectChannels = await this.channelRepository.find({
      where: { project: { id: projectId } },
    })
    candidates.push(...projectChannels)

    if (project.admin?.id) {
      const ownerChannels = await this.channelRepository.find({
        where: { user: { id: project.admin.id } },
      })
      candidates.push(...ownerChannels)
    }

    if (project.organisation?.id) {
      const orgChannels = await this.channelRepository.find({
        where: { organisation: { id: project.organisation.id } },
      })
      candidates.push(...orgChannels)
    }

    const map = new Map<string, NotificationChannel>()
    for (const c of candidates) map.set(c.id, c)
    return Array.from(map.values())
  }

  /** Channels owned by an organisation, accessible by a user that is a confirmed member. */
  async getChannelsForOrganisation(
    organisationId: string,
    userId: string,
  ): Promise<NotificationChannel[]> {
    const memberships = await this.organisationService.findMemberships({
      where: {
        user: { id: userId },
        organisation: { id: organisationId },
        confirmed: true,
      },
    })
    if (memberships.length === 0) {
      throw new ForbiddenException('You are not a member of this organisation')
    }
    return this.channelRepository.find({
      where: { organisation: { id: organisationId } },
    })
  }

  /** Validate channel ids the user wants to attach to a project alert. */
  async validateChannelsForProject(
    channelIds: string[],
    projectId: string,
    userId: string,
  ): Promise<NotificationChannel[]> {
    if (channelIds.length === 0) return []
    const allowed = await this.getChannelsForProject(projectId, userId)
    const allowedIds = new Set(allowed.map((c) => c.id))
    const missing = channelIds.filter((id) => !allowedIds.has(id))
    if (missing.length > 0) {
      throw new ForbiddenException(
        `One or more channels are not accessible for this project: ${missing.join(', ')}`,
      )
    }
    return allowed.filter((c) => channelIds.includes(c.id))
  }

  // --- CRUD -----------------------------------------------------------------

  async findById(id: string) {
    return this.channelRepository.findOne({
      where: { id },
      relations: ['user', 'organisation', 'project'],
    })
  }

  async ensureCallerCanManage(channel: NotificationChannel, userId: string) {
    if (channel.user) {
      if (channel.user.id !== userId) {
        throw new ForbiddenException('Not allowed to manage this channel')
      }
      return
    }
    if (channel.organisation) {
      const memberships = await this.organisationService.findMemberships({
        where: {
          user: { id: userId },
          organisation: { id: channel.organisation.id },
          confirmed: true,
          role: In([OrganisationRole.owner, OrganisationRole.admin]),
        },
      })
      if (memberships.length === 0) {
        throw new ForbiddenException('Not allowed to manage this channel')
      }
      return
    }
    if (channel.project) {
      const project = await this.projectService.getFullProject(
        channel.project.id,
      )
      if (!project) throw new NotFoundException('Project not found')
      this.projectService.allowedToManage(project, userId)
      return
    }
    throw new ForbiddenException('Channel has no scope')
  }

  async create(
    dto: CreateChannelDTO,
    userId: string,
  ): Promise<NotificationChannel> {
    const scopes = [
      dto.organisationId ? 1 : 0,
      dto.projectId ? 1 : 0,
      dto.userScoped ? 1 : 0,
    ]
    const scopeCount = scopes.reduce((a, b) => a + b, 0)
    if (scopeCount > 1) {
      throw new BadRequestException(
        'Specify exactly one scope (user / organisation / project)',
      )
    }
    // Default to user-scoped when nothing supplied.
    const scope = dto.projectId
      ? 'project'
      : dto.organisationId
        ? 'organisation'
        : 'user'

    const partial: Partial<NotificationChannel> = {
      name: dto.name,
      type: dto.type,
      config: this.normaliseConfig(dto.type, dto.config || {}),
      isVerified: false,
    }

    if (scope === 'user') {
      partial.user = { id: userId } as any
    } else if (scope === 'organisation') {
      const canManage = await this.organisationService.canManageOrganisation(
        dto.organisationId!,
        userId,
      )
      if (!canManage) {
        throw new ForbiddenException(
          'You are not allowed to create channels for this organisation',
        )
      }
      partial.organisation = { id: dto.organisationId! } as any
    } else {
      const project = await this.projectService.getFullProject(dto.projectId!)
      if (!project) throw new NotFoundException('Project not found')
      this.projectService.allowedToManage(
        project,
        userId,
        'You are not allowed to create channels for this project',
      )
      partial.project = { id: dto.projectId! } as any
    }

    await this.enforceScopeLimit(scope, {
      userId: scope === 'user' ? userId : undefined,
      organisationId: scope === 'organisation' ? dto.organisationId : undefined,
      projectId: scope === 'project' ? dto.projectId : undefined,
    })

    // Default verification for channel types where the address itself is the proof
    // (Slack/Discord use validated hooks; webhook still requires explicit ping).
    if (
      dto.type === NotificationChannelType.SLACK ||
      dto.type === NotificationChannelType.DISCORD
    ) {
      partial.isVerified = true
    }

    if (dto.type === NotificationChannelType.EMAIL) {
      partial.verificationToken = randomBytes(24).toString('hex')
    }
    if (dto.type === NotificationChannelType.WEBHOOK) {
      partial.verificationToken = randomBytes(24).toString('hex')
    }

    return this.channelRepository.save(this.channelRepository.create(partial))
  }

  private async enforceScopeLimit(
    scope: 'user' | 'organisation' | 'project',
    ids: { userId?: string; organisationId?: string; projectId?: string },
  ) {
    const where =
      scope === 'user'
        ? { user: { id: ids.userId! } }
        : scope === 'organisation'
          ? { organisation: { id: ids.organisationId! } }
          : { project: { id: ids.projectId! } }
    const count = await this.channelRepository.count({ where })
    if (count >= MAX_CHANNELS_PER_SCOPE) {
      throw new ForbiddenException(
        `Maximum number of notification channels (${MAX_CHANNELS_PER_SCOPE}) reached for this scope.`,
      )
    }
  }

  normaliseConfig(
    type: NotificationChannelType,
    raw: Record<string, unknown>,
  ): NotificationChannelConfig {
    switch (type) {
      case NotificationChannelType.EMAIL: {
        const address = String(raw.address || '')
          .trim()
          .toLowerCase()
        if (!EMAIL_REGEX.test(address)) {
          throw new BadRequestException('Invalid email address')
        }
        return { address, unsubscribed: false }
      }
      case NotificationChannelType.TELEGRAM: {
        const chatId = String(raw.chatId || '').trim()
        if (!chatId) throw new BadRequestException('chatId is required')
        return { chatId }
      }
      case NotificationChannelType.SLACK: {
        const url = String(raw.url || '').trim()
        if (!isValidHttpsUrl(url, ['hooks.slack.com'])) {
          throw new BadRequestException('Invalid Slack webhook URL')
        }
        return { url }
      }
      case NotificationChannelType.DISCORD: {
        const url = String(raw.url || '').trim()
        if (!isValidHttpsUrl(url, ['discord.com'])) {
          throw new BadRequestException('Invalid Discord webhook URL')
        }
        return { url }
      }
      case NotificationChannelType.WEBHOOK: {
        const url = String(raw.url || '').trim()
        if (!WebhookChannelService.validateUrl(url)) {
          throw new BadRequestException('Invalid webhook URL')
        }
        return {
          url,
          secret: raw.secret ? String(raw.secret) : null,
        }
      }
      case NotificationChannelType.WEBPUSH: {
        const endpoint = String(raw.endpoint || '').trim()
        const keys = raw.keys as { p256dh?: string; auth?: string }
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
          throw new BadRequestException('Invalid web push subscription')
        }
        return {
          endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
          userAgent: raw.userAgent ? String(raw.userAgent) : null,
        }
      }
      default:
        throw new BadRequestException(`Unsupported channel type: ${type}`)
    }
  }

  async update(
    id: string,
    dto: UpdateChannelDTO,
    userId: string,
  ): Promise<NotificationChannel> {
    const channel = await this.findById(id)
    if (!channel) throw new NotFoundException('Channel not found')
    await this.ensureCallerCanManage(channel, userId)

    if (dto.name) channel.name = dto.name
    if (dto.config) {
      channel.config = this.normaliseConfig(channel.type, dto.config)
      // Re-set isVerified based on type rules
      if (
        channel.type === NotificationChannelType.SLACK ||
        channel.type === NotificationChannelType.DISCORD ||
        channel.type === NotificationChannelType.WEBPUSH
      ) {
        channel.isVerified = true
      } else if (channel.type === NotificationChannelType.EMAIL) {
        channel.isVerified = false
        channel.verificationToken = randomBytes(24).toString('hex')
      } else if (channel.type === NotificationChannelType.WEBHOOK) {
        channel.isVerified = false
        channel.verificationToken = randomBytes(24).toString('hex')
      }
    }
    return this.channelRepository.save(channel)
  }

  async delete(id: string, userId: string): Promise<void> {
    const channel = await this.findById(id)
    if (!channel) throw new NotFoundException('Channel not found')
    await this.ensureCallerCanManage(channel, userId)
    await this.channelRepository.delete(id)
  }

  async markVerified(id: string) {
    await this.channelRepository.update(id, {
      isVerified: true,
      verificationToken: null,
    })
  }

  async findByVerificationToken(token: string) {
    return this.channelRepository.findOne({
      where: { verificationToken: token },
    })
  }

  async setEmailUnsubscribed(id: string, unsubscribed: boolean) {
    const channel = await this.findById(id)
    if (!channel || channel.type !== NotificationChannelType.EMAIL) return
    const cfg = channel.config as { address: string; unsubscribed?: boolean }
    channel.config = { ...cfg, unsubscribed }
    await this.channelRepository.save(channel)
  }

  /** Used by Telegram bot start scene to upsert a channel after linking. */
  async upsertTelegramChannel(userId: string, chatId: string) {
    const existing = await this.channelRepository.findOne({
      where: {
        type: NotificationChannelType.TELEGRAM,
        user: { id: userId },
      },
    })
    if (existing) {
      existing.config = { chatId }
      existing.isVerified = true
      return this.channelRepository.save(existing)
    }
    return this.channelRepository.save(
      this.channelRepository.create({
        name: 'Telegram',
        type: NotificationChannelType.TELEGRAM,
        config: { chatId },
        isVerified: true,
        user: { id: userId } as any,
      }),
    )
  }

  async deleteTelegramChannelsByChatId(chatId: string) {
    const channels = await this.channelRepository.find({
      where: { type: NotificationChannelType.TELEGRAM },
    })
    const matching = channels.filter(
      (c) => (c.config as { chatId?: string })?.chatId === chatId,
    )
    if (matching.length > 0) {
      await this.channelRepository.delete(matching.map((c) => c.id))
    }
  }
}
