import { Telegraf } from 'telegraf'
import type { Context } from './interface/context.interface'
import { registerTelegramHandlers } from './telegram.bot'
import {
  START_SCENE_ID,
  PROJECTS_SCENE_ID,
  SETTINGS_SCENE_ID,
  UNLINK_ACCOUNT_SCENE_ID,
} from './telegram.constants'

describe('Telegram handler registration', () => {
  let bot: Telegraf<Context>
  let updateId: number
  const enter = (scene: string) =>
    jest.fn((ctx: Context) => ctx.scene.enter(scene))
  const handlers = {
    updates: {
      onStart: enter(START_SCENE_ID),
      onLinkAccountConfirm: jest.fn(
        async (_ctx: Context & { match: RegExpExecArray }) => {},
      ),
      onLinkAccountCancel: jest.fn(
        async (_ctx: Context & { match: RegExpExecArray }) => {},
      ),
    },
    start: {
      onSceneEnter: jest.fn(),
      onProjects: enter(PROJECTS_SCENE_ID),
      onSettings: enter(SETTINGS_SCENE_ID),
    },
    projects: {
      onSceneEnter: jest.fn(),
      onText: jest.fn(
        async (_ctx: Context & { message: { text: string } }) => {},
      ),
      onBack: enter(START_SCENE_ID),
    },
    settings: {
      onSceneEnter: jest.fn(),
      onUnlinkAccount: enter(UNLINK_ACCOUNT_SCENE_ID),
      onBack: enter(START_SCENE_ID),
    },
    unlinkAccount: {
      onSceneEnter: jest.fn(),
      onYes: enter(START_SCENE_ID),
      onNo: enter(START_SCENE_ID),
    },
  }
  const from = { id: 123, is_bot: false, first_name: 'Test' }
  const chat = { id: 123, type: 'private' as const, first_name: 'Test' }

  beforeEach(() => {
    jest.clearAllMocks()
    updateId = 0
    bot = new Telegraf<Context>('test-token')
    bot.botInfo = {
      id: 456,
      is_bot: true,
      first_name: 'Test bot',
      username: 'test_bot',
      can_join_groups: false,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
    }
    registerTelegramHandlers(
      bot,
      handlers as unknown as Parameters<typeof registerTelegramHandlers>[1],
    )
  })

  async function sendText(text: string) {
    await bot.handleUpdate({
      update_id: ++updateId,
      message: {
        message_id: updateId,
        date: 0,
        from,
        chat,
        text,
        ...(text === '/start'
          ? {
              entities: [
                { type: 'bot_command' as const, offset: 0, length: 6 },
              ],
            }
          : {}),
      },
    })
  }

  it('keeps scene sessions and routes project selection and back navigation', async () => {
    await sendText('/start')
    await sendText('📂 Projects')
    await sendText('My project')
    await sendText('🔙 Back')

    expect(handlers.updates.onStart).toHaveBeenCalledTimes(1)
    expect(handlers.start.onSceneEnter).toHaveBeenCalledTimes(2)
    expect(handlers.projects.onSceneEnter).toHaveBeenCalledTimes(1)
    expect(handlers.projects.onText).toHaveBeenCalledTimes(1)
    expect(handlers.projects.onText.mock.calls[0][0].message.text).toBe(
      'My project',
    )
    expect(handlers.projects.onBack).toHaveBeenCalledTimes(1)
  })

  it.each(['✅ Yes', '❌ No'])(
    'routes account unlinking choice %s',
    async (choice) => {
      await sendText('/start')
      await sendText('⚙️ Settings')
      await sendText('🔓 Unlink account')
      await sendText(choice)

      expect(handlers.settings.onSceneEnter).toHaveBeenCalledTimes(1)
      expect(handlers.unlinkAccount.onSceneEnter).toHaveBeenCalledTimes(1)
      expect(handlers.unlinkAccount.onYes).toHaveBeenCalledTimes(
        choice === '✅ Yes' ? 1 : 0,
      )
      expect(handlers.unlinkAccount.onNo).toHaveBeenCalledTimes(
        choice === '❌ No' ? 1 : 0,
      )
      expect(handlers.start.onSceneEnter).toHaveBeenCalledTimes(2)
    },
  )

  it('routes settings back navigation', async () => {
    await sendText('/start')
    await sendText('⚙️ Settings')
    await sendText('🔙 Back')

    expect(handlers.settings.onBack).toHaveBeenCalledTimes(1)
    expect(handlers.start.onSceneEnter).toHaveBeenCalledTimes(2)
  })

  it.each(['confirm', 'cancel'])(
    'routes account link %s callbacks inside a scene',
    async (action) => {
      await sendText('/start')
      await bot.handleUpdate({
        update_id: ++updateId,
        callback_query: {
          id: 'callback',
          from,
          chat_instance: 'test-chat',
          data: `link-account:${action}:user-id`,
          message: { message_id: 1, date: 0, chat, text: 'Link account?' },
        },
      })

      const handler =
        action === 'confirm'
          ? handlers.updates.onLinkAccountConfirm
          : handlers.updates.onLinkAccountCancel
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].match[1]).toBe('user-id')
      expect(handler.mock.calls[0][0].from.id).toBe(123)
    },
  )
})
