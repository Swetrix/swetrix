import {
  START_SCENE_ID,
  PROJECTS_SCENE_ID,
  SETTINGS_SCENE_ID,
  UNLINK_ACCOUNT_SCENE_ID,
} from './telegram.constants'
import { Scenes, session, Telegraf } from 'telegraf'
import type { Context } from './interface/context.interface'
import type { TelegramUpdate } from './telegram.update'
import type { StartScene } from './scene/start.scene'
import type { ProjectsScene } from './scene/projects.scene'
import type { SettingsScene } from './scene/settings.scene'
import type { UnlinkAccountScene } from './scene/unlink-account.scene'

export function registerTelegramHandlers(
  bot: Telegraf<Context>,
  handlers: {
    updates: TelegramUpdate
    start: StartScene
    projects: ProjectsScene
    settings: SettingsScene
    unlinkAccount: UnlinkAccountScene
  },
) {
  const start = new Scenes.BaseScene<Context>(START_SCENE_ID)
  start.enter((ctx) => handlers.start.onSceneEnter(ctx))
  start.hears('📂 Projects', (ctx) => handlers.start.onProjects(ctx))
  start.hears('⚙️ Settings', (ctx) => handlers.start.onSettings(ctx))

  const projects = new Scenes.BaseScene<Context>(PROJECTS_SCENE_ID)
  projects.enter((ctx) => handlers.projects.onSceneEnter(ctx))
  projects.hears('🔙 Back', (ctx) => handlers.projects.onBack(ctx))
  projects.on('text', (ctx) => handlers.projects.onText(ctx))

  const settings = new Scenes.BaseScene<Context>(SETTINGS_SCENE_ID)
  settings.enter((ctx) => handlers.settings.onSceneEnter(ctx))
  settings.hears('🔓 Unlink account', (ctx) =>
    handlers.settings.onUnlinkAccount(ctx),
  )
  settings.hears('🔙 Back', (ctx) => handlers.settings.onBack(ctx))

  const unlinkAccount = new Scenes.BaseScene<Context>(UNLINK_ACCOUNT_SCENE_ID)
  unlinkAccount.enter((ctx) => handlers.unlinkAccount.onSceneEnter(ctx))
  unlinkAccount.hears('✅ Yes', (ctx) => handlers.unlinkAccount.onYes(ctx))
  unlinkAccount.hears('❌ No', (ctx) => handlers.unlinkAccount.onNo(ctx))

  const stage = new Scenes.Stage<Context>([
    start,
    projects,
    settings,
    unlinkAccount,
  ])
  bot.use(session())
  bot.use(stage.middleware())
  bot.start((ctx) => handlers.updates.onStart(ctx))
  bot.action(/link-account:confirm:(.+)/, (ctx) =>
    handlers.updates.onLinkAccountConfirm(ctx),
  )
  bot.action(/link-account:cancel:(.+)/, (ctx) =>
    handlers.updates.onLinkAccountCancel(ctx),
  )
}
