import * as _round from 'lodash/round'
import * as _isEmpty from 'lodash/isEmpty'
import * as _keys from 'lodash/keys'
import * as _values from 'lodash/values'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const processMetaKV = (
  rawMeta: Record<string, string>,
): { 'meta.key': string | null; 'meta.value': string | null } => {
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

export const trafficTransformer = (
  psid: string,
  sid: string,
  pid: string,
  pg: string | null,
  prev: string | null,
  dv: string | null,
  br: string | null,
  os: string | null,
  lc: string | null,
  ref: string | null,
  so: string | null,
  me: string | null,
  ca: string | null,
  te: string | null,
  co: string | null,
  cc: string | null,
  rg: string | null,
  ct: string | null,
  meta: Record<string, string> | null,
  sdur: number,
  unique: number,
) => {
  return {
    psid,
    sid,
    pid,
    pg: pg || null,
    prev: prev || null,
    dv: dv || null,
    br: br || null,
    os: os || null,
    lc: lc || null,
    ref: ref || null,
    so: so || null,
    me: me || null,
    ca: ca || null,
    te: te || null,
    co: co || null,
    cc: cc || null,
    rg: rg || null,
    ct: ct || null,
    ...processMetaKV(meta),
    sdur,
    unique,
    created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
  }
}

export const customEventTransformer = (
  psid: string,
  pid: string,
  ev: string,
  pg: string | null,
  dv: string | null,
  br: string | null,
  os: string | null,
  lc: string | null,
  ref: string | null,
  so: string | null,
  me: string | null,
  ca: string | null,
  te: string | null,
  co: string | null,
  cc: string | null,
  rg: string | null,
  ct: string | null,
  meta: Record<string, string> | null,
) => {
  return {
    psid,
    pid,
    ev,
    pg: pg || null,
    dv: dv || null,
    br: br || null,
    os: os || null,
    lc: lc || null,
    ref: ref || null,
    so: so || null,
    me: me || null,
    ca: ca || null,
    te: te || null,
    co: co || null,
    cc: cc || null,
    rg: rg || null,
    ct: ct || null,
    ...processMetaKV(meta),
    created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
  }
}

export const errorEventTransformer = (
  eid: string,
  pid: string,
  pg: string | null,
  dv: string | null,
  br: string | null,
  os: string | null,
  lc: string | null,
  cc: string | null,
  rg: string | null,
  ct: string | null,
  name: string | null,
  message: string | null,
  lineno: number | null,
  colno: number | null,
  filename: string | null,
) => {
  return {
    eid,
    pid,
    pg: pg || null,
    dv: dv || null,
    br: br || null,
    os: os || null,
    lc: lc || null,
    cc: cc || null,
    rg: rg || null,
    ct: ct || null,
    name: name || null,
    message: message || null,
    lineno: lineno || null,
    colno: colno || null,
    filename: filename || null,
    created: dayjs.utc().format('YYYY-MM-DD HH:mm:ss'),
  }
}

export const performanceTransformer = (
  pid: string,
  pg: string | null,
  dv: string | null,
  br: string | null,
  cc: string | null,
  rg: string | null,
  ct: string | null,
  dns: number,
  tls: number,
  conn: number,
  response: number,
  render: number,
  domLoad: number,
  pageLoad: number,
  ttfb: number,
) => {
  return {
    pid,
    pg: pg || null,
    dv: dv || null,
    br: br || null,
    cc: cc || null,
    rg: rg || null,
    ct: ct || null,
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
