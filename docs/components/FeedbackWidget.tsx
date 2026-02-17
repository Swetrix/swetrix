'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThumbsUp, ThumbsDown } from '@phosphor-icons/react';
import Link from 'next/link';

const FEEDBACK_TTL_DAYS = 7;
const FEEDBACK_TTL_MS = FEEDBACK_TTL_DAYS * 24 * 60 * 60 * 1000;

const NEGATIVE_REASONS = [
  'Content is out of date',
  'Missing information',
  'Code examples not working as expected',
  'Other',
];

function storageKeyForPath(pathname: string) {
  return `docs.feedback:${pathname}`;
}

function hasRecentFeedback(pathname: string) {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(storageKeyForPath(pathname));
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data.ts === 'number' && Date.now() - data.ts < FEEDBACK_TTL_MS) {
        return true;
      }
    }
  } catch {}
  return false;
}

function persistFeedback(pathname: string, answer: string, reason?: string) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        storageKeyForPath(pathname),
        JSON.stringify({ answer, reason, ts: Date.now() }),
      );
    } catch {}
  }
}

async function trackFeedback(answer: string, pathname: string, reason?: string) {
  try {
    await (window as any)?.swetrix?.track({
      ev: 'DOCS_FEEDBACK',
      meta: { answer, path: pathname, ...(reason ? { reason } : {}) },
    });
  } catch {}
}

export function FeedbackWidget() {
  const pathname = usePathname();
  const [submitted, setSubmitted] = useState(false);
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [reason, setReason] = useState('');
  const suppressed = useMemo(() => hasRecentFeedback(pathname), [pathname]);

  useEffect(() => {
    setSubmitted(false);
    setShowReasonForm(false);
    setReason('');
  }, [pathname]);

  const onClickYes = async () => {
    await trackFeedback('Yes', pathname);
    persistFeedback(pathname, 'Yes');
    setSubmitted(true);
  };

  const onClickNo = () => {
    setShowReasonForm(true);
  };

  const onSubmitReason = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason) return;
    await trackFeedback('No', pathname, reason);
    persistFeedback(pathname, 'No', reason);
    setSubmitted(true);
    setShowReasonForm(false);
  };

  return (
    <section
      className="mt-8 overflow-hidden rounded-lg border border-fd-border bg-fd-card p-5 max-sm:hidden"
      aria-label="Docs feedback widget"
    >
      <h2 className="mb-2 text-2xl font-bold">Help us improve Swetrix</h2>
      {submitted || suppressed ? (
        <p className="mb-10" aria-live="polite">
          Thank you for your feedback ❤️
        </p>
      ) : (
        <>
          {showReasonForm ? (
            <form className="mt-2" onSubmit={onSubmitReason}>
              <p className="mb-4 text-lg">Why was this page not helpful to you?</p>
              <div className="mb-3 grid gap-2" role="group" aria-label="Choose a reason">
                {NEGATIVE_REASONS.map((label) => (
                  <label key={label} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="feedback-reason"
                      value={label}
                      checked={reason === label}
                      onChange={() => setReason(label)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
                disabled={!reason}
              >
                Submit
              </button>
            </form>
          ) : (
            <>
              <p className="mb-4 text-lg">Was this page helpful to you?</p>
              <div className="mb-3 flex gap-3" role="group">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-500 transition-colors hover:bg-emerald-500 hover:text-white"
                  onClick={onClickYes}
                  aria-label="Yes, this page was helpful"
                >
                  <ThumbsUp size={18} />
                  Yes
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-red-500 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                  onClick={onClickNo}
                  aria-label="No, this page was not helpful"
                >
                  <ThumbsDown size={18} />
                  No
                </button>
              </div>
            </>
          )}
        </>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/contribute" className="font-semibold text-fd-primary hover:underline">
          Learn how to contribute
        </Link>
        <span className="opacity-60">•</span>
        <a
          href="https://github.com/Swetrix/swetrix/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-fd-primary hover:underline"
        >
          Report a problem with this content
        </a>
      </div>
    </section>
  );
}
