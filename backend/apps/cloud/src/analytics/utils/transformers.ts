import _round from 'lodash/round'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _values from 'lodash/values'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const processMetaKV = (
  rawMeta: Record<string, string> | null | undefined,
): { 'meta.key': string[] | null; 'meta.value': string[] | null } => {
  if (!rawMeta || _isEmpty(rawMeta)) {
    return {
      'meta.key': null,
      'meta.value': null,
    }
  }

  return {
    'meta.key': _keys(rawMeta),
    'meta.value': _values(rawMeta),
  }
}

interface CommonOptions {
  pid: string
  psid?: string | null
  profileId?: string | null
  host?: string | null
  pg?: string | null
  dv?: string | null
  br?: string | null
  brv?: string | null
  os?: string | null
  osv?: string | null
  lc?: string | null
  ref?: string | null
  so?: string | null
  me?: string | null
  ca?: string | null
  te?: string | null
  co?: string | null
  cc?: string | null
  rg?: string | null
  rgc?: string | null
  ct?: string | null
  isp?: string | null
  og?: string | null
  ut?: string | null
  ctp?: string | null
  meta?: Record<string, string> | null
}

interface PageviewOptions extends CommonOptions {
  type: 'pageview'
}

interface CustomEventOptions extends CommonOptions {
  type: 'custom_event'
  ev: string
}

interface ErrorEventOptions extends CommonOptions {
  type: 'error'
  eid: string
  name?: string | null
  message?: string | null
  lineno?: number | null
  colno?: number | null
  filename?: string | null
  stackTrace?: string | null
}

interface PerformanceOptions extends Omit<
  CommonOptions,
  | 'psid'
  | 'profileId'
  | 'os'
  | 'osv'
  | 'lc'
  | 'ref'
  | 'so'
  | 'me'
  | 'ca'
  | 'te'
  | 'co'
  | 'meta'
> {
  type: 'performance'
  dns: number
  tls: number
  conn: number
  response: number
  render: number
  domLoad: number
  pageLoad: number
  ttfb: number
}

interface CaptchaOptions {
  type: 'captcha'
  pid: string
  dv?: string | null
  br?: string | null
  os?: string | null
  cc?: string | null
  timestamp?: number
}

type EventTransformerOptions =
  | PageviewOptions
  | CustomEventOptions
  | ErrorEventOptions
  | PerformanceOptions
  | CaptchaOptions

const buildCommon = (opts: CommonOptions) => ({
  pid: opts.pid,
  psid: opts.psid ?? null,
  profileId: opts.profileId ?? null,
  host: opts.host || null,
  pg: opts.pg || null,
  dv: opts.dv || null,
  br: opts.br || null,
  brv: opts.brv || null,
  os: opts.os || null,
  osv: opts.osv || null,
  lc: opts.lc || null,
  ref: opts.ref || null,
  so: opts.so || null,
  me: opts.me || null,
  ca: opts.ca || null,
  te: opts.te || null,
  co: opts.co || null,
  cc: opts.cc || null,
  rg: opts.rg || null,
  rgc: opts.rgc || null,
  ct: opts.ct || null,
  isp: opts.isp || null,
  og: opts.og || null,
  ut: opts.ut || null,
  ctp: opts.ctp || null,
  ...processMetaKV(opts.meta),
})

// Single transformer for all event kinds; the discriminator is `type`.
// Renames at the storage boundary: ev -> event_name, name -> error_name,
// message -> error_message, filename -> error_filename. DTO and API field
// names stay as the legacy short forms.
export const eventTransformer = (opts: EventTransformerOptions) => {
  const created = dayjs.utc().format('YYYY-MM-DD HH:mm:ss')

  if (opts.type === 'pageview') {
    return {
      type: 'pageview' as const,
      ...buildCommon(opts),
      created,
    }
  }

  if (opts.type === 'custom_event') {
    return {
      type: 'custom_event' as const,
      ...buildCommon(opts),
      event_name: opts.ev,
      created,
    }
  }

  if (opts.type === 'error') {
    return {
      type: 'error' as const,
      ...buildCommon(opts),
      eid: opts.eid,
      error_name: opts.name || null,
      error_message: opts.message || null,
      stackTrace: opts.stackTrace || null,
      lineno: opts.lineno ?? null,
      colno: opts.colno ?? null,
      error_filename: opts.filename || null,
      created,
    }
  }

  if (opts.type === 'performance') {
    return {
      type: 'performance' as const,
      pid: opts.pid,
      host: opts.host || null,
      pg: opts.pg || null,
      dv: opts.dv || null,
      br: opts.br || null,
      brv: opts.brv || null,
      cc: opts.cc || null,
      rg: opts.rg || null,
      rgc: opts.rgc || null,
      ct: opts.ct || null,
      isp: opts.isp || null,
      og: opts.og || null,
      ut: opts.ut || null,
      ctp: opts.ctp || null,
      dns: _round(opts.dns),
      tls: _round(opts.tls),
      conn: _round(opts.conn),
      response: _round(opts.response),
      render: _round(opts.render),
      domLoad: _round(opts.domLoad),
      pageLoad: _round(opts.pageLoad),
      ttfb: _round(opts.ttfb),
      created,
    }
  }

  // captcha
  return {
    type: 'captcha' as const,
    pid: opts.pid,
    dv: opts.dv || null,
    br: opts.br || null,
    os: opts.os || null,
    cc: opts.cc || null,
    created:
      typeof opts.timestamp === 'number'
        ? dayjs.utc(opts.timestamp).format('YYYY-MM-DD HH:mm:ss')
        : created,
  }
}
