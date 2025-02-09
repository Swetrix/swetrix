import { useSelector } from 'react-redux'

import { FeatureFlag } from '~/lib/models/User'
import { StateType } from '~/lib/store'

const useFeatureFlag = (flag: FeatureFlag): boolean => {
  const { user } = useSelector((state: StateType) => state.auth)

  if (!user?.featureFlags) {
    return false
  }

  return user.featureFlags.includes(flag)
}

export default useFeatureFlag
