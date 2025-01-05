import { useSelector } from 'react-redux'
import { StateType } from '~/lib/store'
import { FeatureFlag } from '~/lib/models/User'

const useFeatureFlag = (flag: FeatureFlag): boolean => {
  const { user } = useSelector((state: StateType) => state.auth)

  if (!user?.featureFlags) {
    return false
  }

  return user.featureFlags.includes(flag)
}

export default useFeatureFlag
