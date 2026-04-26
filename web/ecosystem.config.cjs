module.exports = {
  apps: [
    {
      name: 'Swetrix Frontend',
      cwd: __dirname,
      script: './start.cjs',
      exec_mode: 'cluster',
      instances: 'max',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
