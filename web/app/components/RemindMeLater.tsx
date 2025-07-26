import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Modal from '~/ui/Modal'

interface RemindMeLaterProps {
  isOpen: boolean
  onClose: () => void
}

const RemindMeLater = ({ isOpen, onClose }: RemindMeLaterProps) => {
  const { t } = useTranslation('common')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
      return
    }

    setIsSubmitting(true)
    
    // TODO: Implement API call to save email for reminder
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Reminder email saved:', email)
      onClose()
      setEmail('')
    } catch (error) {
      console.error('Failed to save reminder:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    onClose()
  }

  return (
    <Modal
      type="info"
      title="Remind me later via email"
      isOpened={isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitText="Remind Me"
      closeText="Maybe later"
      submitDisabled={!email || !email.includes('@') || isSubmitting}
      isLoading={isSubmitting}
      message={
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Enter your email below, we'll send a reminder to your inbox so you remember to sign-up later :)
          </p>
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder-gray-400"
              autoFocus
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You will receive exactly one reminder email. Never again.
          </p>
        </div>
      }
    />
  )
}

export default RemindMeLater