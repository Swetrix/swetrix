import type { MetaFunction } from 'react-router'

import Onboarding from '~/pages/Onboarding'

export const meta: MetaFunction = () => {
  return [
    { title: 'Onboarding - Swetrix' },
    { name: 'description', content: 'Get started with Swetrix analytics in just a few steps.' },
  ]
}

export default function OnboardingRoute() {
  return <Onboarding />
}