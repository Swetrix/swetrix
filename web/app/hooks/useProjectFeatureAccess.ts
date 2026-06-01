import { useMemo } from 'react'

import { isSelfhosted } from '~/lib/constants'
import type { PlanFeatureCode } from '~/lib/pricing/features'
import { useCurrentProject } from '~/providers/CurrentProjectProvider'

export const useProjectFeatureAccess = (feature: PlanFeatureCode) => {
  const { project } = useCurrentProject()

  return useMemo(() => {
    const isOwner = project?.role === 'owner'

    return {
      hasAccess: isSelfhosted || project?.featureAccess?.[feature] === true,
      isOwner,
    }
  }, [feature, project])
}
