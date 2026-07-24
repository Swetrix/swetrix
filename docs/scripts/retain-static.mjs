// Keeps static assets from previous builds available after a redeploy.
//
// `next build` regenerates `.next/static` from scratch, so any visitor holding
// HTML from an earlier deploy (restored tab, browser cache) hits 404s on every
// content-hashed chunk. The page then renders as inert prerendered HTML: no
// hydration, no click handlers, no ⌘K search. This script archives each
// build's static assets and merges past builds back into `.next/static`, so
// stale HTML keeps working. Assets unseen for RETENTION_DAYS are pruned.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RETENTION_DAYS = 60;

const docsRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const staticDir = path.join(docsRoot, ".next", "static");
const archiveDir = path.join(docsRoot, ".static-archive");

function mergeMissing(from, to) {
  if (!fs.existsSync(from)) return 0;
  let copied = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copied += mergeMissing(src, dest);
    } else if (!fs.existsSync(dest)) {
      fs.mkdirSync(to, { recursive: true });
      fs.copyFileSync(src, dest);
      copied += 1;
    }
  }
  return copied;
}

function prune(dir, cutoffMs) {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removed += prune(p, cutoffMs);
      if (fs.readdirSync(p).length === 0) fs.rmdirSync(p);
    } else if (fs.statSync(p).mtimeMs < cutoffMs) {
      fs.unlinkSync(p);
      removed += 1;
    }
  }
  return removed;
}

try {
  if (!fs.existsSync(staticDir)) {
    console.warn("retain-static: no .next/static found, skipping");
    process.exit(0);
  }

  const restored = mergeMissing(archiveDir, staticDir);
  const archived = mergeMissing(staticDir, archiveDir);
  const pruned = prune(archiveDir, Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  console.log(
    `retain-static: restored ${restored} asset(s) from previous builds, archived ${archived} new, pruned ${pruned} older than ${RETENTION_DAYS}d`,
  );
} catch (err) {
  // Never fail the build over asset retention.
  console.warn("retain-static: failed, continuing without retention:", err);
}
