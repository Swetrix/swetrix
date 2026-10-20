# Translations

Edit `web/public/locales/en.json`, then run this from `web`:

```sh
npm run translate
```

Set `GEMINI_API_KEY` in `web/.env` or your shell. Shell values take precedence.
`GEMINI_MODEL` overrides the default `gemini-3.1-pro-preview` model, and
`GEMINI_RPM` sets the request limit (default: 20 per minute). Gemini API usage
still applies; Crowdin is no longer involved.

The script translates new or changed English strings, removes obsolete keys,
and writes the French, German, Polish, Ukrainian and Brazilian Portuguese JSON
files directly. Brazilian Portuguese remains in `pt.json`. Existing translations
are preserved unless their English source changes or validation finds invalid
placeholders or markup. Arrays, nested objects and language-specific i18next
plural forms are supported.

Commit the locale changes **together with `web/scripts/translation-state.json`**.
That file records English source hashes and pending keys for each language. It
starts from the existing translations, so the migration does not retranslate the
whole catalogue. Do not delete or regenerate it after changing English strings;
restore it from Git if it is lost.

```sh
npm run translate -- --dry-run
npm run translate -- --check
npm run translate -- --languages=fr,pt-BR
npm run translate -- --languages=de --limit=25
```

`--dry-run` lists the required changes without writing files or calling Gemini.
`--check` also makes no API calls or writes, and exits with status 1 if the selected
languages need syncing. It can be used in CI without an API key. `pt` is accepted
as an alias for `pt-BR`.

Successful batches are saved as they finish. Failed, invalid, skipped and limited
translations stay pending for the next run. Existing text remains available on a
failed update; missing strings use English until translation succeeds. A normal
run exits with status 1 if any selected language is still incomplete, including
when `--limit` leaves work unfinished. Unselected languages remain pending even
when the selected languages finish successfully.

The script rejects concurrent runs and refuses to overwrite files changed during
translation. If a process is killed, confirm it has stopped before deleting the
leftover `web/scripts/translation-state.json.lock` file and rerunning.

Run the focused tests from `web`:

```sh
node --test scripts/tests/translate.test.mjs
```
