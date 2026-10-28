# Cloud warehouse exports

This module owns Cloud-only BigQuery delivery and the scoped raw-event export API. Community Edition does not register the module. Customer instructions and the schema are in `docs/content/docs/integrations/data-warehouse.mdx`.

## Deployment

1. Apply `backend/migrations/mysql/2026_10_27_data_exports.sql` to the Cloud MySQL database before deploying the API. It adds connection configuration, encrypted service-account credentials, and persistent progress; it does not change ClickHouse data.
2. Keep the existing `SECRET_KEY_BASE` stable across API workers and restarts. Saved credentials cannot be decrypted with a different key. Back it up through the existing secret-management process.
3. Ensure every API worker uses the same Redis queue configuration and MySQL database. The scheduled dispatcher and BullMQ worker must run in the Cloud deployment.
4. Allow outbound HTTPS access to Google's OAuth and BigQuery APIs. Credentials are provided per connection through the authenticated settings API; no global Google service-account environment variable is needed.
5. Provide writable temporary storage. The exporter streams a day's rows to private NDJSON files, uploads them, and removes them on completion or failure. The combined day is capped at 10 GiB; allow at least that much free space per concurrent export, plus headroom. Each worker allows two jobs concurrently, and multiple API processes multiply this requirement. Abrupt process termination can leave `swetrix-warehouse-*` temporary directories; remove abandoned directories only after confirming that no worker uses them.

The module uses the existing Google authentication library and queue infrastructure. Do not enable it in the Community app module or copy its migration into Community startup.

## Delivery behaviour

- One BigQuery destination is stored per Swetrix project. Connection responses omit the encrypted credential field.
- A dispatcher runs each minute and submits due connections using a stable per-connection BullMQ job ID. Backfill processes up to seven completed UTC days per job; remaining history is picked up by the next dispatcher pass. Once caught up, the next run is scheduled for 06:00 UTC and refreshes up to three recent completed days for late arrivals.
- Jobs allow three attempts with exponential backoff starting at one minute. A failed run also persists a later retry time. Inspect both the connection status and queue when investigating a failure.
- The source is ClickHouse `events`, restricted to the project, date, native rows (`importID IS NULL`), and the selected event types. Imported aggregate history is intentionally excluded.
- BigQuery tables are partitioned by `event_date` and marked with an ownership description. Existing tables must match the project's marker, schema, and partitioning.
- Populated partitions are replaced using load jobs; empty days remove that date's existing rows. A successful day requires both destination tables to finish.
- Pausing or disconnecting prevents subsequent work. A request already uploading a day can finish. Disconnecting never deletes Google tables.
- Workers recheck the current project owner and account status before each day. An ownership change disables delivery until the connection is saved with new credentials. Changes to the destination, start date, or owner reset the backfill checkpoint. Credential-only rotation preserves progress.
- Deletion in Swetrix does not guarantee deletion from old BigQuery partitions, derived tables, or other exported copies. Customers manage warehouse retention and erasure.

## Verification before customer rollout

Run the focused suite from `backend` with `node --experimental-vm-modules node_modules/jest/bin/jest.js --preset ts-jest --testEnvironment node --runInBand --watchman=false apps/cloud/src/data-export` on a Node version compatible with the installed NestJS dependencies.

Local mocked tests cannot establish Google IAM, upload, or production scheduling behaviour. Use a dedicated Google Cloud test project and dataset to verify the deployed integration:

1. Grant a test service account BigQuery Data Editor on the dataset and BigQuery Job User on the project. Test the connection, including a deliberately mismatched location and an unrelated table prefix.
2. Export a known completed UTC day with pageviews, custom events, outbound events, and metadata. Compare row counts with the matching native ClickHouse query, not a dashboard total that includes imports.
3. Verify both tables' schema, UTC partitioning, metadata records, and string visitor/session IDs in BigQuery.
4. Sync the same day again and confirm counts do not double. Exercise an empty day and retry after a worker restart or simulated failed load; verify progress is advanced only after both tables succeed.
5. Check automatic scheduling across multiple workers, pause/resume, credential rotation, disconnection, project deletion, and project ownership changes.
6. Call the raw export endpoint with a project-restricted key granting Analytics and Events read access. Verify wrong-project keys, missing scopes, public visitors, and read-only project users cannot export.
7. Verify download cancellation closes the source query and failed/incomplete downloads are not published by the example pipeline.

Keep service-account JSON, access tokens, and raw event contents out of logs and incident reports. Diagnose failures from the safe error status, the destination's Google job history, and queue state.
