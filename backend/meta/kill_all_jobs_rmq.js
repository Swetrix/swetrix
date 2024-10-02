/* eslint-disable @typescript-eslint/no-require-imports */
const { Queue } = require('bullmq')
require('dotenv').config()

async function cleanAllJobs(queueName) {
  const queue = new Queue(queueName, {
    connection: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      // Add other Redis connection options if needed
    },
  })

  try {
    // Clean all completed jobs
    await queue.clean(0, 1000, 'completed')
    console.log('Completed jobs cleaned')

    // Clean all waiting jobs
    await queue.clean(0, 1000, 'wait')
    console.log('Waiting jobs cleaned')

    // Clean all active jobs
    await queue.clean(0, 1000, 'active')
    console.log('Active jobs cleaned')

    // Clean all delayed jobs
    await queue.clean(0, 1000, 'delayed')
    console.log('Delayed jobs cleaned')

    // Clean all failed jobs
    await queue.clean(0, 1000, 'failed')
    console.log('Failed jobs cleaned')

    // Drain the queue (remove all jobs)
    await queue.drain()
    console.log('Queue drained')

    // Obliterate the queue (remove all data and jobs associated with the queue)
    await queue.obliterate({ force: true })
    console.log('Queue obliterated')
  } catch (error) {
    console.error('Error cleaning jobs:', error)
  } finally {
    await queue.close()
  }
}

cleanAllJobs('monitor')
