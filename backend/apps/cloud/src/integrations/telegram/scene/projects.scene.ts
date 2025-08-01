import { Ctx, Hears, On, Scene, SceneEnter } from 'nestjs-telegraf'
import { Markup } from 'telegraf'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { ProjectService } from '../../../project/project.service'
import { UserService } from '../../../user/user.service'
import { AnalyticsService } from '../../../analytics/analytics.service'
import { Context } from '../interface/context.interface'
import { START_SCENE_ID } from './start.scene'

dayjs.extend(utc)
dayjs.extend(timezone)

export const PROJECTS_SCENE_ID = 'projects'
@Scene(PROJECTS_SCENE_ID)
export class ProjectsScene {
  constructor(
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() context: Context) {
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
        ...projects.map(project => [project.name]),
        ['🔙 Back'],
      ]).resize(),
    )
  }

  @On('text')
  async onText(@Ctx() context: Context & { message: { text: string } }) {
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

    const text =
      `📊 *${project.name}*` +
      `\n\n` +
      `*Information*` +
      `\n` +
      `ID: \`${project.id}\`` +
      `\n` +
      `Active: \`${project.active ? 'yes' : 'no'}\`` +
      `\n` +
      `Public: \`${project.public ? 'yes' : 'no'}\`` +
      `\n` +
      `Created: \`${dayjs
        .utc(project.created)
        .tz(user.timezone)
        .format('YYYY-MM-DD HH:mm:ss')}\`` +
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

  @Hears('🔙 Back')
  async onBack(@Ctx() context: Context) {
    await context.scene.enter(START_SCENE_ID)
  }
}
