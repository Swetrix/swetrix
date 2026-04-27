import _round from 'lodash/round'
import _isEmpty from 'lodash/isEmpty'
import _keys from 'lodash/keys'
import _values from 'lodash/values'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const processMetaKV = (
  rawMeta: Record<string, string>,
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

interface TrafficTransformerOptions {
  psid: string
  profileId: string
  pid: string
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

export const trafficTransformer = ({
  psid,
  profileId,
  pid,
  host,
  pg,
  dv,
  br,
  brv,
  os,
  osv,
  lc,
  ref,
  so,
  me,
  ca,
  te,
  co,
  cc,
  rg,
  rgc,
  ct,
  isp,
  og,
  ut,
  ctp,
  meta,
}: TrafficTransformerOptions) => {
  return {
    psid,
    profileId,
    pid,
    host: host || null,
    pg: pg || null,
    dv: dv || null,
    br: br || null,
    brv: brv || null,
    os: os || null,
    osv: osv || null,
    lc: lc || null,
    ref: ref || null,
    so: so || null,
    me: me || null,
    ca: ca || null,
    te: te || null,
    co: co || null,
    cc: cc || null,
    rg: rg || null,
    rgc: rgc || null,
    ct: ct || null,
    isp: isp || null,
    og: og || null,
    ut: ut || null,
    ctp: ctp || null,
    ...processMetaKV(meta),
    created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
  }
}

interface CustomEventTransformerOptions {
  psid: string
  profileId: string
  pid: string
  host?: string | null
  ev: string
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

export const customEventTransformer = ({
  psid,
  profileId,
  pid,
  host,
  ev,
  pg,
  dv,
  br,
  brv,
  os,
  osv,
  lc,
  ref,
  so,
  me,
  ca,
  te,
  co,
  cc,
  rg,
  rgc,
  ct,
  isp,
  og,
  ut,
  ctp,
  meta,
}: CustomEventTransformerOptions) => {
  return {
    psid,
    profileId,
    pid,
    host: host || null,
    ev,
    pg: pg || null,
    dv: dv || null,
    br: br || null,
    brv: brv || null,
    os: os || null,
    osv: osv || null,
    lc: lc || null,
    ref: ref || null,
    so: so || null,
    me: me || null,
    ca: ca || null,
    te: te || null,
    co: co || null,
    cc: cc || null,
    rg: rg || null,
    rgc: rgc || null,
    ct: ct || null,
    isp: isp || null,
    og: og || null,
    ut: ut || null,
    ctp: ctp || null,
    ...processMetaKV(meta),
    created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
  }
}

interface ErrorEventTransformerOptions {
  psid: string
  profileId: string
  eid: string
  pid: string
  host?: string | null
  pg?: string | null
  dv?: string | null
  br?: string | null
  brv?: string | null
  os?: string | null
  osv?: string | null
  lc?: string | null
  cc?: string | null
  rg?: string | null
  rgc?: string | null
  ct?: string | null
  isp?: string | null
  og?: string | null
  ut?: string | null
  ctp?: string | null
  name?: string | null
  message?: string | null
  lineno?: number | null
  colno?: number | null
  filename?: string | null
  stackTrace?: string | null
  meta?: Record<string, string> | null
}

export const errorEventTransformer = ({
  psid,
  profileId,
  eid,
  pid,
  host,
  pg,
  dv,
  br,
  brv,
  os,
  osv,
  lc,
  cc,
  rg,
  rgc,
  ct,
  isp,
  og,
  ut,
  ctp,
  name,
  message,
  lineno,
  colno,
  filename,
  stackTrace,
  meta,
}: ErrorEventTransformerOptions) => {
  return {
    psid,
    profileId,
    eid,
    pid,
    host: host || null,
    pg: pg || null,
    dv: dv || null,
    br: br || null,
    brv: brv || null,
    os: os || null,
    osv: osv || null,
    lc: lc || null,
    cc: cc || null,
    rg: rg || null,
    rgc: rgc || null,
    ct: ct || null,
    isp: isp || null,
    og: og || null,
    ut: ut || null,
    ctp: ctp || null,
    name: name || null,
    message: message || null,
    lineno: lineno || null,
    colno: colno || null,
    filename: filename || null,
    stackTrace: stackTrace || null,
    ...processMetaKV(meta),
    created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
  }
}

interface PerformanceTransformerOptions {
  pid: string
  host?: string | null
  pg?: string | null
  dv?: string | null
  br?: string | null
  brv?: string | null
  cc?: string | null
  rg?: string | null
  rgc?: string | null
  ct?: string | null
  isp?: string | null
  og?: string | null
  ut?: string | null
  ctp?: string | null
  dns: number
  tls: number
  conn: number
  response: number
  render: number
  domLoad: number
  pageLoad: number
  ttfb: number
}

export const performanceTransformer = ({
  pid,
  host,
  pg,
  dv,
  br,
  brv,
  cc,
  rg,
  rgc,
  ct,
  isp,
  og,
  ut,
  ctp,
  dns,
  tls,
  conn,
  response,
  render,
  domLoad,
  pageLoad,
  ttfb,
}: PerformanceTransformerOptions) => {
  return {
    pid,
    host: host || null,
    pg: pg || null,
    dv: dv || null,
    br: br || null,
    brv: brv || null,
    cc: cc || null,
    rg: rg || null,
    rgc: rgc || null,
    ct: ct || null,
    isp: isp || null,
    og: og || null,
    ut: ut || null,
    ctp: ctp || null,
    dns: _round(dns),
    tls: _round(tls),
    conn: _round(conn),
    response: _round(response),
    render: _round(render),
    domLoad: _round(domLoad),
    pageLoad: _round(pageLoad),
    ttfb: _round(ttfb),
    created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
  }
}
