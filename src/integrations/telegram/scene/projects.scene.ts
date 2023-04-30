import { Ctx, Hears, On, Scene, SceneEnter } from 'nestjs-telegraf'
import { Markup } from 'telegraf'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as timezone from 'dayjs/plugin/timezone'
import { ProjectService } from 'src/project/project.service'
import { UserService } from 'src/user/user.service'
import { AnalyticsService } from 'src/analytics/analytics.service'
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
    }

    const onlineCount = await this.analyticsService.getOnlineCountByProjectId(
      project.id,
    )
    const stats = await this.analyticsService.getStatsByProjectId(project.id)

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
      `Page views: \`${stats[project.id].thisWeek}\`` +
      `\n` +
      `Unique page views: \`${stats[project.id].thisWeekUnique}\``

    await context.replyWithMarkdown(text)
  }

  @Hears('🔙 Back')
  async onBack(@Ctx() context: Context) {
    await context.scene.enter(START_SCENE_ID)
  }
}
