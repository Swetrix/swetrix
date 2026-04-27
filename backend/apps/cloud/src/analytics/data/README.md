# Bot protection data files

## `referrer-spammers.txt`

A list of known referrer-spam hosts used by the strict bot-protection level to
discard requests whose `Referer` (or `Origin`) belongs to a spammer.

- Source: https://raw.githubusercontent.com/matomo-org/referrer-spam-list/master/spammers.txt
- License: BSD 3-Clause (matomo-org/referrer-spam-list)
- Format: one host per line, lower-cased, no scheme, no `www.` prefix.
- Refresh cadence: pull upstream every ~3 months.

The file is loaded once at module init into an in-memory `Set` for O(1)
lookups; keep it sorted-ish to make diffs reviewable.
