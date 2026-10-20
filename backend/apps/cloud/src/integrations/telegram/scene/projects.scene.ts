import { Injectable } from '@nestjs/common'
import { Markup } from 'telegraf'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { ProjectService } from '../../../project/project.service'
import { UserService } from '../../../user/user.service'
import { AnalyticsService } from '../../../analytics/analytics.service'
import { Context } from '../interface/context.interface'
import { START_SCENE_ID } from '../telegram.constants'
import { TelegramService } from '../telegram.service'

dayjs.extend(utc)
dayjs.extend(timezone)

@Injectable()
export class ProjectsScene {
  constructor(
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
    private readonly analyticsService: AnalyticsService,
    private readonly telegramService: TelegramService,
  ) {}

  async onSceneEnter(context: Context) {
    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    const projects = await this.projectService.getProjectsByUserId(user.id)

    if (projects.length === 0) {
      await context.reply(
        'You have no projects yet.',
        Markup.keyboard([['🔙 Back']])
          .oneTime()
          .resize(),
      )
      return
    }

    await context.reply(
      'Projects',
      Markup.keyboard([
        ...projects.map((project) => [project.name]),
        ['🔙 Back'],
      ]).resize(),
    )
  }

  async onText(context: Context & { message: { text: string } }) {
    if (context.message.text === '🔙 Back') {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    const user = await this.userService.getUserByTelegramId(context.from.id)

    if (!user) {
      await context.scene.enter(START_SCENE_ID)
      return
    }

    const project = await this.projectService.getProjectByNameAndUserId(
      context.message.text,
      user.id,
    )

    if (!project) {
      await context.reply('Project not found.')
      await context.scene.reenter()
      return
    }

    const onlineCount = await this.analyticsService.getOnlineUserCount(
      project.id,
    )
    const stats = await this.analyticsService.getAnalyticsSummary(
      [project.id],
      undefined,
      '7d',
    )

    // Prevent Telegram Markdown injection (project names are user-controlled).
    const safeProjectName = this.telegramService.escapeTelegramMarkdown(
      project.name,
    )
    const safeProjectId = this.telegramService.escapeTelegramMarkdown(
      project.id,
    )

    const text =
      `📊 *${safeProjectName}*` +
      `\n\n` +
      `*Information*` +
      `\n` +
      `ID: \`${safeProjectId}\`` +
      `\n` +
      `Active: \`${project.active ? 'yes' : 'no'}\`` +
      `\n` +
      `Public: \`${project.public ? 'yes' : 'no'}\`` +
      `\n` +
      `Created: \`${dayjs.utc(project.created).tz(user.timezone).format('YYYY-MM-DD HH:mm:ss')}\`` +
      `\n\n` +
      `*Analytics (last 7 days)*` +
      `\n` +
      `Online users: \`${onlineCount}\`` +
      `\n` +
      `Page views: \`${stats[project.id].current.all}\`` +
      `\n` +
      `Unique page views: \`${stats[project.id].current.unique}\``

    await context.replyWithMarkdown(text)
  }

  async onBack(context: Context) {
    await context.scene.enter(START_SCENE_ID)
  }
}
