import { BellRingingIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetcher } from 'react-router'
import { toast } from 'sonner'

import type { NotificationChannelActionData } from '~/routes/notification-channel'
import Button from '~/ui/Button'

const SW_PATH = '/sw.js'

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const out = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    out[i] = rawData.charCodeAt(i)
  }
  return out
}

const arrayBufferToBase64 = (buffer: ArrayBuffer | null): string => {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

interface EnableWebPushButtonProps {
  onSubscribed?: () => void
  /** Render style. "button" (default) shows a Button; "link" shows an underlined inline link. */
  variant?: 'button' | 'link'
  className?: string
}

const EnableWebPushButton = ({
  onSubscribed,
  variant = 'button',
  className,
}: EnableWebPushButtonProps) => {
  const { t } = useTranslation('common')
  const subscribeFetcher = useFetcher<NotificationChannelActionData>()
  const lastSubscribeData = useRef<NotificationChannelActionData | null>(null)
  const [busy, setBusy] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ok =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    setSupported(ok)
  }, [])

  useEffect(() => {
    if (subscribeFetcher.state !== 'idle' || !subscribeFetcher.data) return
    if (lastSubscribeData.current === subscribeFetcher.data) return
    lastSubscribeData.current = subscribeFetcher.data
    setBusy(false)
    if (subscribeFetcher.data.error) {
      toast.error(subscribeFetcher.data.error)
      return
    }
    if (subscribeFetcher.data.success) {
      toast.success(t('notificationChannels.webpush.enabled'))
      onSubscribed?.()
    }
  }, [subscribeFetcher.state, subscribeFetcher.data, t, onSubscribed])

  const onClick = async () => {
    if (!supported) {
      toast.error(t('notificationChannels.webpush.unsupported'))
      return
    }
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error(t('notificationChannels.webpush.permissionDenied'))
        setBusy(false)
        return
      }

      const registration =
        (await navigator.serviceWorker.getRegistration(SW_PATH)) ||
        (await navigator.serviceWorker.register(SW_PATH))

      const keyData = new FormData()
      keyData.set('intent', 'webpush-public-key')
      const keyResp = await fetch('/notification-channel', {
        method: 'POST',
        body: keyData,
      })
      const contentType = keyResp.headers.get('content-type') || ''
      if (!keyResp.ok || !contentType.includes('application/json')) {
        toast.error(t('notificationChannels.webpush.subscribeFailed'))
        setBusy(false)
        return
      }
      const keyJson = (await keyResp.json()) as {
        publicKey?: string | null
        error?: string
      }
      if (!keyJson.publicKey) {
        toast.error(
          keyJson.error || t('notificationChannels.webpush.notConfigured'),
        )
        setBusy(false)
        return
      }

      const appServerKey = urlBase64ToUint8Array(keyJson.publicKey)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer.slice(
          appServerKey.byteOffset,
          appServerKey.byteOffset + appServerKey.byteLength,
        ) as ArrayBuffer,
      })

      const sub = subscription.toJSON() as {
        endpoint?: string
        keys?: { p256dh?: string; auth?: string }
      }
      const endpoint = sub.endpoint || subscription.endpoint
      const p256dh =
        sub.keys?.p256dh ||
        arrayBufferToBase64(subscription.getKey?.('p256dh') as ArrayBuffer)
      const auth =
        sub.keys?.auth ||
        arrayBufferToBase64(subscription.getKey?.('auth') as ArrayBuffer)

      if (!endpoint || !p256dh || !auth) {
        toast.error(t('notificationChannels.webpush.subscribeFailed'))
        setBusy(false)
        return
      }

      const formData = new FormData()
      formData.set('intent', 'webpush-subscribe')
      formData.set('name', `Browser (${navigator.platform || 'web'})`)
      formData.set('endpoint', endpoint)
      formData.set('keys', JSON.stringify({ p256dh, auth }))
      formData.set('userAgent', navigator.userAgent || '')
      subscribeFetcher.submit(formData, {
        method: 'POST',
        action: '/notification-channel',
      })
    } catch (e) {
      console.error(e)
      toast.error(t('notificationChannels.webpush.subscribeFailed'))
      setBusy(false)
    }
  }

  if (!supported) return null

  const loading = busy || subscribeFetcher.state !== 'idle'

  if (variant === 'link') {
    return (
      <button
        type='button'
        onClick={onClick}
        disabled={loading}
        className={
          className ||
          'font-medium text-amber-900 underline decoration-dashed underline-offset-2 hover:decoration-solid disabled:opacity-50 dark:text-amber-50'
        }
      >
        {loading
          ? t('common.loading')
          : t('notificationChannels.webpush.enable')}
      </button>
    )
  }

  return (
    <Button
      variant='secondary'
      size='xs'
      onClick={onClick}
      loading={loading}
      className={className}
    >
      <span className='inline-flex items-center gap-1'>
        <BellRingingIcon className='size-4' aria-hidden />
        {t('notificationChannels.webpush.enable')}
      </span>
    </Button>
  )
}

export default EnableWebPushButton
