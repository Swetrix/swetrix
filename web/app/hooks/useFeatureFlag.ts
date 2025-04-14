import { FeatureFlag } from '~/lib/models/User'
import { useAuth } from '~/providers/AuthProvider'

const useFeatureFlag = (flag: FeatureFlag): boolean => {
  const { user } = useAuth()

  if (!user?.featureFlags) {
    return false
  }

  return user.featureFlags.includes(flag)
}

export default useFeatureFlag
