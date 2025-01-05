module.exports = {
  apps: [
    {
      name: 'Swetrix Frontend',
      script: './start.sh',
      exec_mode: 'cluster',
      instances: 'max',
    },
  ],
}
