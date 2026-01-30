// PM2 Ecosystem Configuration
// Gerencia a aplicação Next.js em produção

module.exports = {
  apps: [
    {
      name: 'entrega-pra-mim',
      script: 'npm',
      args: 'start',
      cwd: '/home/entrega/entrega_pra_mim',
      instances: 'max', // Usa todos os CPUs disponíveis
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logs
      error_file: '/home/entrega/logs/pm2-error.log',
      out_file: '/home/entrega/logs/pm2-out.log',
      log_file: '/home/entrega/logs/pm2-combined.log',
      time: true,
      // Reiniciar se usar muita memória
      max_restarts: 10,
      min_uptime: '10s',
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
}
