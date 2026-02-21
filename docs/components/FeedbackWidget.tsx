"use client";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ThumbsUpIcon, ThumbsDownIcon } from "@phosphor-icons/react";
import Link from "next/link";

const FEEDBACK_TTL_DAYS = 7;
const FEEDBACK_TTL_MS = FEEDBACK_TTL_DAYS * 24 * 60 * 60 * 1000;

const NEGATIVE_REASONS = [
  "Content is out of date",
  "Missing information",
  "Code examples not working as expected",
  "Other",
];

const getNowMs = () => {
  return Date.now();
};

const storageKeyForPath = (pathname: string) => {
  return `docs.feedback:${pathname}`;
};

const hasRecentFeedback = (pathname: string) => {
  if (typeof window === "undefined") return false;
  try {
    const key = storageKeyForPath(pathname);
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data.ts === "number" && getNowMs() - data.ts < FEEDBACK_TTL_MS) {
        return true;
      }
    }
  } catch (reason) {
    console.error("Error checking recent feedback:", reason);
  }

  return false;
};

const persistFeedback = (pathname: string, answer: string, reason: string) => {
  if (typeof window !== "undefined") {
    try {
      const key = storageKeyForPath(pathname);
      const value = JSON.stringify({ answer, reason, ts: getNowMs() });
      window.localStorage.setItem(key, value);
    } catch (reason) {
      console.error("Error persisting feedback:", reason);
    }
  }
};

const trackFeedback = async (answer: string, pathname: string, reason: string) => {
  try {
    await (window as any)?.swetrix?.track({
      ev: "DOCS_FEEDBACK",
      meta: {
        answer,
        path: pathname,
        ...(reason ? { reason } : {}),
      },
    });
  } catch (reason) {
    console.error("Error tracking feedback:", reason);
  }
};

export function FeedbackWidget() {
  const pathname = usePathname();
  const [submitted, setSubmitted] = useState(false);
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [reason, setReason] = useState("");
  const suppressed = useMemo(() => hasRecentFeedback(pathname), [pathname]);

  useEffect(() => {
    setSubmitted(false);
    setShowReasonForm(false);
    setReason("");
  }, [pathname]);

  const onClickYes = async () => {
    await trackFeedback("Yes", pathname, "");
    persistFeedback(pathname, "Yes", "");
    setSubmitted(true);
  };

  const onClickNo = () => {
    setShowReasonForm(true);
  };

  const onSubmitReason = async (event: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault?.();
    if (!reason) return;
    await trackFeedback("No", pathname, reason);
    persistFeedback(pathname, "No", reason);
    setSubmitted(true);
    setShowReasonForm(false);
  };

  return (
    <section
      className="hidden sm:block mt-8 ring-1 ring-gray-300 dark:ring-slate-800/80 rounded-xl p-6 bg-transparent relative overflow-hidden"
      aria-label="Docs feedback widget"
    >
      <div
        className="absolute right-0 -top-4 w-[140px] h-[140px] opacity-10 dark:opacity-5 pointer-events-none"
        aria-hidden="true"
      >
        <img
          src="https://swetrix.com/logo512.png"
          alt=""
          className="w-full h-full object-contain -rotate-10"
        />
      </div>
      <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white mt-2">
        Help us improve Swetrix
      </h2>
      {submitted || suppressed ? (
        <p aria-live="polite" className="m-0 mb-12 text-lg text-slate-700 dark:text-slate-300">
          Thank you for your feedback ❤️
        </p>
      ) : (
        <>
          {showReasonForm ? (
            <form className="mt-4" onSubmit={onSubmitReason}>
              <p className="text-lg mb-4 text-slate-700 dark:text-slate-300">
                Why was this page not helpful to you?
              </p>
              <div
                role="group"
                aria-label="Choose a reason"
                className="grid gap-3 mb-5 relative z-10"
              >
                {NEGATIVE_REASONS.map((label) => (
                  <label
                    key={label}
                    className="flex items-center gap-3 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <input
                      type="radio"
                      name="feedback-reason"
                      value={label}
                      checked={reason === label}
                      onChange={() => setReason(label)}
                      className="w-4 h-4 text-slate-900 focus:ring-slate-900 dark:text-slate-100 dark:focus:ring-slate-300 bg-transparent border-gray-300 dark:border-slate-600"
                    />
                    <span className="font-medium">{label}</span>
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-slate-800 dark:hover:bg-slate-200 relative z-10"
                disabled={!reason}
                aria-disabled={!reason}
              >
                Submit
              </button>
            </form>
          ) : (
            <>
              <p className="text-lg mb-4 text-slate-700 dark:text-slate-300">
                Was this page helpful to you?
              </p>
              <div role="group" className="flex gap-3 mb-6 relative z-10">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 border border-emerald-500 text-emerald-600 dark:text-emerald-500 bg-transparent hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white px-5 py-2 rounded-lg transition-colors font-medium"
                  onClick={onClickYes}
                  aria-label="Yes, this page was helpful"
                >
                  <ThumbsUpIcon width={20} height={20} weight="duotone" />
                  Yes
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 border border-red-500 text-red-600 dark:text-red-500 bg-transparent hover:bg-red-500 hover:text-white dark:hover:bg-red-600 dark:hover:text-white px-5 py-2 rounded-lg transition-colors font-medium"
                  onClick={onClickNo}
                  aria-label="No, this page was not helpful"
                >
                  <ThumbsDownIcon width={20} height={20} weight="duotone" />
                  No
                </button>
              </div>
            </>
          )}
        </>
      )}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-800 flex items-center gap-3 flex-wrap text-sm text-slate-500 dark:text-slate-400 relative z-10">
        <Link
          className="font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
          href="/contribute"
        >
          Learn how to contribute
        </Link>
        <span className="opacity-40">•</span>
        <Link
          className="font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
          href="https://github.com/Swetrix/swetrix/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          Report a problem with this content
        </Link>
      </div>
    </section>
  );
}
