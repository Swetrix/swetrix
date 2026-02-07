import _omit from 'lodash/omit'

export enum TimeFormat {
  '12-hour' = '12-hour',
  '24-hour' = '24-hour',
}

export const DEFAULT_TIMEZONE = 'Etc/GMT'

export enum OnboardingStep {
  LANGUAGE = 'language',
  WELCOME = 'welcome',
  FEATURE_TRAFFIC = 'feature_traffic',
  FEATURE_ERRORS = 'feature_errors',
  FEATURE_SESSIONS = 'feature_sessions',
  CREATE_PROJECT = 'create_project',
  SETUP_TRACKING = 'setup_tracking',
  WAITING_FOR_EVENTS = 'waiting_for_events',
  VERIFY_EMAIL = 'verify_email',
  COMPLETED = 'completed',
}
