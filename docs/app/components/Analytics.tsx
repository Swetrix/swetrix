"use client";

import { useEffect } from "react";
import * as Swetrix from "swetrix";

const SWETRIX_PID = "STEzHcB1rALV";

type SessionReplayActions = Awaited<ReturnType<typeof Swetrix.startSessionReplay>>;

let sessionReplayActions: SessionReplayActions | null = null;
let sessionReplayStart: Promise<SessionReplayActions | null> | null = null;

const trackSessionReplay = () => {
  if (typeof window === "undefined" || window.self !== window.top) {
    return;
  }

  if (sessionReplayActions || sessionReplayStart) {
    return;
  }

  sessionReplayStart = Swetrix.startSessionReplay({
    privacy: "normal",
  })
    .then((actions) => {
      if (!actions) {
        return null;
      }

      sessionReplayActions = actions;

      return actions;
    })
    .catch((reason) => {
      console.error("Failed to start Swetrix session replay:", reason);
      return null;
    })
    .finally(() => {
      sessionReplayStart = null;
    });
};

export default function Analytics() {
  useEffect(() => {
    Swetrix.init(SWETRIX_PID);
    Swetrix.trackViews();
    trackSessionReplay();
  }, []);

  return null;
}
