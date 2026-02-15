import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from '@docusaurus/router'
import { ThumbsUpIcon, ThumbsDownIcon } from '@phosphor-icons/react'
import Link from '@docusaurus/Link'

const FEEDBACK_TTL_DAYS = 7
const FEEDBACK_TTL_MS = FEEDBACK_TTL_DAYS * 24 * 60 * 60 * 1000

const NEGATIVE_REASONS = [
  'Content is out of date',
  'Missing information',
  'Code examples not working as expected',
  'Other',
]

const getNowMs = () => {
  return Date.now()
}

const storageKeyForPath = (pathname) => {
  return `docs.feedback:${pathname}`
}

const hasRecentFeedback = (pathname) => {
  if (typeof window === 'undefined') return false
  try {
    const key = storageKeyForPath(pathname)
    const raw = window.localStorage.getItem(key)
    if (raw) {
      const data = JSON.parse(raw)
      if (
        data &&
        typeof data.ts === 'number' &&
        getNowMs() - data.ts < FEEDBACK_TTL_MS
      ) {
        return true
      }
    }
  } catch (reason) {
    console.error('Error checking recent feedback:', reason)
  }

  return false
}

const persistFeedback = (pathname, answer, reason) => {
  if (typeof window !== 'undefined') {
    try {
      const key = storageKeyForPath(pathname)
      const value = JSON.stringify({ answer, reason, ts: getNowMs() })
      window.localStorage.setItem(key, value)
    } catch (reason) {
      console.error('Error persisting feedback:', reason)
    }
  }
}

const trackFeedback = async (answer, pathname, reason) => {
  try {
    await window?.swetrix?.track({
      ev: 'DOCS_FEEDBACK',
      meta: {
        answer,
        path: pathname,
        ...(reason ? { reason } : {}),
      },
    })
  } catch (reason) {
    console.error('Error tracking feedback:', reason)
  }
}

export default function FeedbackWidget() {
  const { pathname } = useLocation()
  const [submitted, setSubmitted] = useState(false)
  const [showReasonForm, setShowReasonForm] = useState(false)
  const [reason, setReason] = useState('')
  const suppressed = useMemo(() => hasRecentFeedback(pathname), [pathname])

  useEffect(() => {
    setSubmitted(false)
    setShowReasonForm(false)
    setReason('')
  }, [pathname])

  const onClickYes = async () => {
    await trackFeedback('Yes', pathname)
    persistFeedback(pathname, 'Yes')
    setSubmitted(true)
  }

  const onClickNo = () => {
    setShowReasonForm(true)
  }

  const onSubmitReason = async (event) => {
    event?.preventDefault?.()
    if (!reason) return
    await trackFeedback('No', pathname, reason)
    persistFeedback(pathname, 'No', reason)
    setSubmitted(true)
    setShowReasonForm(false)
  }

  return (
    <section className='swx-feedback-card' aria-label='Docs feedback widget'>
      <div className='swx-feedback-art' aria-hidden='true'>
        <img src='https://swetrix.com/logo512.png' alt='' />
      </div>
      <h2 className='swx-feedback-title'>Help us improve Swetrix</h2>
      {submitted || suppressed ? (
        <p aria-live='polite' className='swx-feedback-thanks'>
          Thank you for your feedback ❤️
        </p>
      ) : (
        <>
          {showReasonForm ? (
            <form className='swx-feedback-form' onSubmit={onSubmitReason}>
              <p className='swx-feedback-question'>
                Why was this page not helpful to you?
              </p>
              <div
                role='group'
                aria-label='Choose a reason'
                className='swx-feedback-reasons'
              >
                {NEGATIVE_REASONS.map((label) => (
                  <label key={label} className='swx-feedback-reason'>
                    <input
                      type='radio'
                      name='feedback-reason'
                      value={label}
                      checked={reason === label}
                      onChange={() => setReason(label)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <button
                type='submit'
                className='button button--lg button--primary swx-feedback-submit'
                disabled={!reason}
                aria-disabled={!reason}
              >
                Submit
              </button>
            </form>
          ) : (
            <>
              <p className='swx-feedback-question'>
                Was this page helpful to you?
              </p>
              <div role='group' className='swx-feedback-actions'>
                <button
                  type='button'
                  className='button button--lg swx-feedback-btn swx-feedback-btn--yes'
                  onClick={onClickYes}
                  aria-label='Yes, this page was helpful'
                >
                  <ThumbsUpIcon width={18} height={18} />
                  Yes
                </button>
                <button
                  type='button'
                  className='button button--lg swx-feedback-btn swx-feedback-btn--no'
                  onClick={onClickNo}
                  aria-label='No, this page was not helpful'
                >
                  <ThumbsDownIcon width={18} height={18} />
                  No
                </button>
              </div>
            </>
          )}
        </>
      )}
      <div className='swx-feedback-links'>
        {/* {editUrl ? (
              <Link className="swx-feedback-link" to={editUrl} target="_blank" rel="noopener noreferrer">
                Edit this page on GitHub
              </Link>
            ) : null} */}

        <Link className='swx-feedback-contribute' to='/contribute'>
          Learn how to contribute
        </Link>
        <span className='swx-feedback-sep'>•</span>
        <Link
          className='swx-feedback-link'
          to='https://github.com/Swetrix/swetrix/issues'
          target='_blank'
          rel='noopener noreferrer'
        >
          Report a problem with this content
        </Link>
      </div>
    </section>
  )
}
