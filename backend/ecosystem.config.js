module.exports = {
  apps: [
    {
      name: 'Swetrix API',
      script: './dist/main.js',
      exec_mode: 'cluster',
      instances: 'max',
    },
  ],
}
