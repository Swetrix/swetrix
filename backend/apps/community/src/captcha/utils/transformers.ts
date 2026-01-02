import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export const captchaTransformer = (
  pid: string,
  dv: string | null,
  br: string | null,
  os: string | null,
  cc: string | null,
  timestamp: number,
) => {
  return {
    pid,
    dv: dv || null,
    br: br || null,
    os: os || null,
    cc: cc || null,
    created: dayjs.utc(timestamp).format('YYYY-MM-DD HH:mm:ss'),
  }
}
