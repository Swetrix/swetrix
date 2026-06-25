import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import StatusPage from '~/ui/StatusPage'
import { trackError } from '~/utils/analytics'
import routes from '~/utils/routes'

const TabErrorFallback = ({ titleKey }: { titleKey?: string }) => {
  const { t } = useTranslation('common')

  return (
    <StatusPage
      type='error'
      title={t(titleKey ?? 'dashboard.failedToLoadTitle')}
      description={t('dashboard.failedToLoadDesc')}
      actions={[
        {
          label: t('dashboard.reloadPage'),
          onClick: () => window.location.reload(),
          primary: true,
        },
        { label: t('notFoundPage.support'), to: routes.contact },
      ]}
    />
  )
}

interface TabErrorBoundaryProps {
  children: ReactNode
  /** Translation key for the title, e.g. `dashboard.failedToLoadTraffic`. Falls back to a generic title. */
  titleKey?: string
  resetKey?: unknown
}

interface TabErrorBoundaryState {
  hasError: boolean
  resetKey: unknown
}

/**
 * Catches render errors thrown while resolving a tab's deferred data (or
 * anything below it) and shows the shared error StatusPage instead of crashing
 * the dashboard. Mirrors the empty-state idiom rather than a loud red card.
 */
class TabErrorBoundary extends Component<
  TabErrorBoundaryProps,
  TabErrorBoundaryState
> {
  constructor(props: TabErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      resetKey: props.resetKey,
    }
  }

  static getDerivedStateFromError(): Partial<TabErrorBoundaryState> {
    return { hasError: true }
  }

  static getDerivedStateFromProps(
    props: TabErrorBoundaryProps,
    state: TabErrorBoundaryState,
  ): Partial<TabErrorBoundaryState> | null {
    if (props.resetKey === state.resetKey) {
      return null
    }

    return {
      hasError: false,
      resetKey: props.resetKey,
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    trackError({
      name: `TabErrorBoundary: ${error.message}`,
      message: error.message,
      lineno: 0,
      colno: 0,
      stackTrace: [error.stack, info.componentStack].filter(Boolean).join('\n'),
    })
  }

  render() {
    if (this.state.hasError) {
      return <TabErrorFallback titleKey={this.props.titleKey} />
    }

    return this.props.children
  }
}

export default TabErrorBoundary
