import { Injectable, Logger } from '@nestjs/common'
import handlebars from 'handlebars'
import { QueryMetric } from '../alert/dto/alert.dto'

const COMMON_VARIABLES = [
  'alert_name',
  'project_name',
  'project_id',
  'dashboard_url',
  'value',
  'threshold',
  'condition',
  'time_window',
] as const

const METRIC_VARIABLES: Record<QueryMetric, readonly string[]> = {
  [QueryMetric.PAGE_VIEWS]: ['views'],
  [QueryMetric.UNIQUE_PAGE_VIEWS]: ['unique_views'],
  [QueryMetric.ONLINE_USERS]: ['online_count'],
  [QueryMetric.CUSTOM_EVENTS]: [
    'event_name',
    'event_count',
    'every_event_mode',
  ],
  [QueryMetric.ERRORS]: [
    'error_count',
    'error_message',
    'error_name',
    'errors_url',
    'is_new_only',
  ],
}

const DEFAULT_ALERT_TEMPLATE = `🔔 Alert *{{alert_name}}* triggered!

Project: [{{project_name}}]({{dashboard_url}})
Value: *{{value}}* {{condition}} *{{threshold}}* in the last {{time_window}}.`

const DEFAULT_ERROR_ALERT_TEMPLATE = `🐞 Error alert *{{alert_name}}* triggered!

Project: [{{project_name}}]({{dashboard_url}})
Error: \`{{error_name}}\`
Message: \`{{error_message}}\`

[View error]({{errors_url}})`

export const DEFAULT_EMAIL_SUBJECT_TEMPLATE = `[Swetrix] {{alert_name}} triggered`

@Injectable()
export class TemplateRendererService {
  private readonly logger = new Logger(TemplateRendererService.name)

  // Compiled-template cache keyed by raw template string. Bounded — alerts re-use
  // the same template per fire so this stays small in practice.
  private readonly cache = new Map<string, HandlebarsTemplateDelegate>()

  getVariablesForMetric(metric: QueryMetric): string[] {
    const extras = METRIC_VARIABLES[metric] ?? []
    return [...COMMON_VARIABLES, ...extras]
  }

  getDefaultTemplate(metric: QueryMetric): string {
    if (metric === QueryMetric.ERRORS) {
      return DEFAULT_ERROR_ALERT_TEMPLATE
    }
    return DEFAULT_ALERT_TEMPLATE
  }

  render(
    template: string | null | undefined,
    context: Record<string, unknown>,
  ): string {
    if (!template) return ''
    try {
      let compiled = this.cache.get(template)
      if (!compiled) {
        compiled = handlebars.compile(template, { noEscape: true })
        if (this.cache.size > 256) this.cache.clear()
        this.cache.set(template, compiled)
      }
      return compiled(context)
    } catch (reason) {
      this.logger.error(`Failed to render alert template: ${reason}`)
      return template
    }
  }
}
