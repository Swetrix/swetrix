/**
 * Backfills the `user_subscription` table from Paddle.
 *
 * Existing users have no subscription history rows, so every subscription that
 * predates the table has to come from Paddle itself. Subscriptions are matched
 * to users by email, which is the only key Paddle's Classic API exposes on the
 * subscription list.
 *
 * Known weakness: a user who changed their Swetrix email after subscribing will
 * not match, and their invoice history stays hidden. Those are reported as
 * unmatched at the end. Going forward the webhooks record `paddleUserId`, which
 * is stable across resubscribes and email changes.
 *
 * Usage (dry run, writes nothing):
 *   node scripts/backfill-user-subscriptions.js
 *
 * Usage (actually insert):
 *   node scripts/backfill-user-subscriptions.js --apply
 */

const path = require('path')
const crypto = require('crypto')
const mysql = require('mysql2/promise')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const APPLY = process.argv.includes('--apply')
const RESULTS_PER_PAGE = 200
const PADDLE_STATES = ['active', 'past_due', 'trialing', 'deleted']
const PADDLE_TIMEOUT_MS = 30_000

const {
  PADDLE_VENDOR_ID,
  PADDLE_API_KEY,
  MYSQL_HOST,
  MYSQL_USER,
  MYSQL_ROOT_PASSWORD,
  MYSQL_DATABASE,
} = process.env

const fetchPaddleSubscriptionsPage = async (state, page) => {
  const body = new URLSearchParams()
  body.set('vendor_id', String(Number(PADDLE_VENDOR_ID)))
  body.set('vendor_auth_code', PADDLE_API_KEY)
  body.set('state', state)
  body.set('page', String(page))
  body.set('results_per_page', String(RESULTS_PER_PAGE))

  const res = await fetch('https://vendors.paddle.com/api/2.0/subscription/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(PADDLE_TIMEOUT_MS),
  })
  const data = await res.json()

  if (!res.ok || !data?.success) {
    throw new Error(
      `Paddle subscription list failed (state=${state}, page=${page}): ${JSON.stringify(
        data?.error || data,
      )}`,
    )
  }

  return data.response || []
}

const fetchAllPaddleSubscriptions = async () => {
  const subscriptions = new Map()

  for (const state of PADDLE_STATES) {
    let page = 1

    // the default listing omits deleted subscriptions, so every state has to be
    // paged through separately
    for (;;) {
      const results = await fetchPaddleSubscriptionsPage(state, page)

      results.forEach((subscription) => {
        subscriptions.set(String(subscription.subscription_id), {
          subID: String(subscription.subscription_id),
          email: String(subscription.user_email || '').trim(),
          paddleUserId: subscription.user_id
            ? String(subscription.user_id)
            : null,
          planId: subscription.plan_id ? String(subscription.plan_id) : null,
          startedAt: subscription.signup_date || null,
          endedAt: subscription.cancellation_effective_date || null,
          state,
        })
      })

      console.log(
        `  paddle: state=${state} page=${page} -> ${results.length} subscription(s)`,
      )

      if (results.length < RESULTS_PER_PAGE) {
        break
      }

      page += 1
    }
  }

  return Array.from(subscriptions.values())
}

const main = async () => {
  if (!PADDLE_VENDOR_ID || !PADDLE_API_KEY) {
    throw new Error('PADDLE_VENDOR_ID / PADDLE_API_KEY are not set')
  }

  console.log(
    APPLY
      ? 'Running in APPLY mode - rows will be inserted'
      : 'Running in DRY RUN mode - nothing will be written (pass --apply to insert)',
  )

  console.log('\nFetching subscriptions from Paddle...')
  const subscriptions = await fetchAllPaddleSubscriptions()
  console.log(`Fetched ${subscriptions.length} distinct subscription(s)`)

  const connection = await mysql.createConnection({
    host: MYSQL_HOST,
    port: 3306,
    user: MYSQL_USER,
    password: MYSQL_ROOT_PASSWORD,
    database: MYSQL_DATABASE,
    timezone: 'Z',
  })

  try {
    // Paddle reports every date in UTC and they are inserted as literal
    // strings, so the session has to interpret them as UTC too
    await connection.query("SET time_zone = '+00:00'")

    const [users] = await connection.query('SELECT `id`, `email` FROM `user`')
    const usersByEmail = new Map(
      users
        .filter(({ email }) => !!email)
        .map(({ id, email }) => [email.trim().toLowerCase(), id]),
    )

    let existingRows = []

    try {
      ;[existingRows] = await connection.query(
        'SELECT `subID` FROM `user_subscription`',
      )
    } catch (reason) {
      // a dry run is useful before the migration has been applied; an apply is not
      if (reason.code !== 'ER_NO_SUCH_TABLE' || APPLY) {
        throw reason
      }

      console.log(
        '\nNote: `user_subscription` does not exist yet - run migrations/mysql/2026_07_25_user_subscriptions.sql before --apply.',
      )
    }

    const existing = new Set(existingRows.map(({ subID }) => subID))

    const toInsert = []
    const unmatched = []

    subscriptions.forEach((subscription) => {
      const userId = usersByEmail.get(subscription.email.toLowerCase())

      if (!userId) {
        unmatched.push(subscription)
        return
      }

      toInsert.push([
        crypto.randomUUID(),
        userId,
        subscription.subID,
        subscription.paddleUserId,
        subscription.planId,
        subscription.startedAt,
        subscription.endedAt,
        subscription.email,
      ])
    })

    const fresh = toInsert.filter(([, , subID]) => !existing.has(subID))

    console.log(`\nMatched to a user: ${toInsert.length}`)
    console.log(`  already recorded: ${toInsert.length - fresh.length}`)
    console.log(`  to insert:        ${fresh.length}`)

    fresh.forEach(([, userId, subID, , , startedAt, endedAt, email]) => {
      console.log(
        `    + ${subID}  ${email}  user=${userId}  started=${startedAt || '?'}${
          endedAt ? `  ended=${endedAt}` : ''
        }`,
      )
    })

    if (unmatched.length > 0) {
      console.log(
        `\nNo Swetrix user matches these ${unmatched.length} subscription(s) - most are deleted accounts, the rest are users who changed their email after subscribing:`,
      )
      unmatched.forEach(({ subID, email, state }) => {
        console.log(`    ? ${subID}  ${email || '<no email>'}  state=${state}`)
      })
    }

    if (!APPLY) {
      console.log('\nDry run complete, nothing was written.')
      return
    }

    if (toInsert.length === 0) {
      console.log('\nNothing to insert.')
      return
    }

    // every matched subscription goes through the same statement: rows that
    // already exist only get their empty columns filled in, so this is
    // rerunnable and never overwrites richer data written by the webhooks
    await connection.query(
      'INSERT INTO `user_subscription` (`id`, `userId`, `subID`, `paddleUserId`, `planId`, `startedAt`, `endedAt`) VALUES ? ' +
        'ON DUPLICATE KEY UPDATE `paddleUserId` = COALESCE(`paddleUserId`, VALUES(`paddleUserId`)), ' +
        '`planId` = COALESCE(`planId`, VALUES(`planId`)), ' +
        '`startedAt` = COALESCE(`startedAt`, VALUES(`startedAt`)), ' +
        '`endedAt` = COALESCE(`endedAt`, VALUES(`endedAt`))',
      [toInsert.map((row) => row.slice(0, 7))],
    )

    const [[{ total }]] = await connection.query(
      'SELECT COUNT(*) AS total FROM `user_subscription`',
    )

    console.log(
      `\nInserted ${fresh.length} new row(s); ${total} subscription(s) recorded in total.`,
    )
  } finally {
    await connection.end()
  }
}

main().catch((reason) => {
  console.error(reason)
  process.exit(1)
})
