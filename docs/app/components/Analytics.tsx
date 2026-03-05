"use client";

import { useEffect } from "react";
import * as Swetrix from "swetrix";

const SWETRIX_PID = "STEzHcB1rALV";

export default function Analytics() {
  useEffect(() => {
    Swetrix.init(SWETRIX_PID);
    Swetrix.trackViews();
  }, []);

  return null;
}
