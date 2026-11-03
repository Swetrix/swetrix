import { Telegraf, TelegramError } from 'telegraf'
import { Repository } from 'typeorm'
import { Message } from './entities/message.entity'
import { TelegramMessageWorker } from './telegram-message.worker'

describe('Telegram message delivery', () => {
  const message = {
    id: 'message-id',
    chatId: 'chat-id',
    text: 'An alert fired',
    extra: { parse_mode: 'Markdown' },
  }
  const sendMessage = jest.fn()
  const messages = { find: jest.fn(), delete: jest.fn() }
  let worker: TelegramMessageWorker

  beforeEach(() => {
    jest.resetAllMocks()
    messages.find.mockResolvedValue([message])
    worker = new TelegramMessageWorker(
      { telegram: { sendMessage } } as unknown as Telegraf,
      messages as unknown as Repository<Message>,
    )
  })

  it('sends queued alerts with their saved options before removing them', async () => {
    sendMessage.mockImplementationOnce(async () => {
      expect(messages.delete).not.toHaveBeenCalled()
    })
    await worker.sendQueuedMessages()
    expect(sendMessage).toHaveBeenCalledWith(
      message.chatId,
      message.text,
      message.extra,
    )
    expect(messages.delete).toHaveBeenCalledWith(message.id)
  })

  it.each([
    new Error('Network unavailable'),
    new TelegramError({ error_code: 502, description: 'Bad gateway' }),
    new TelegramError({ error_code: 401, description: 'Unauthorized' }),
  ])('retains the alert after %s and delivers it on retry', async (error) => {
    sendMessage.mockRejectedValueOnce(error)
    await worker.sendQueuedMessages()
    expect(messages.delete).not.toHaveBeenCalled()
    await worker.sendQueuedMessages()
    expect(messages.delete).toHaveBeenCalledWith(message.id)
  })

  it('respects Telegram’s retry interval', async () => {
    jest.useFakeTimers()
    try {
      sendMessage.mockRejectedValueOnce(
        new TelegramError({
          error_code: 429,
          description: 'Too many requests',
          parameters: { retry_after: 30 },
        }),
      )
      await worker.sendQueuedMessages()
      jest.advanceTimersByTime(29000)
      await worker.sendQueuedMessages()
      expect(sendMessage).toHaveBeenCalledTimes(1)
      expect(messages.delete).not.toHaveBeenCalled()
      jest.advanceTimersByTime(1000)
      await worker.sendQueuedMessages()
      expect(messages.delete).toHaveBeenCalledWith(message.id)
    } finally {
      jest.useRealTimers()
    }
  })

  it.each([400, 403])(
    'continues past a permanently rejected alert (%i)',
    async (code) => {
      messages.find.mockResolvedValue([message, { ...message, id: 'next' }])
      sendMessage.mockRejectedValueOnce(
        new TelegramError({ error_code: code, description: 'Rejected' }),
      )
      await worker.sendQueuedMessages()
      expect(sendMessage).toHaveBeenCalledTimes(2)
      expect(messages.delete.mock.calls).toEqual([[message.id], ['next']])
    },
  )
})
