module.exports = {
  apps: [
    {
      name: 'rla-congreso',
      script: 'npm',
      args: 'start',
      exp_backoff_restart_delay: 100,
      max_memory_start: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Forzamos las variables aquí para asegurar que PM2 las inyecte
        DATABASE_URL: 'mysql://db_congreso%40congreso.derechoconcursal.org:AccesoDB2026@localhost:3306/congresov2',
        NEXTAUTH_URL: 'https://congreso.derechoconcursal.org/',
        NEXTAUTH_SECRET: 'ctWTID2jKhsaBgt+X94/ZPyeCTYkLR+CiANaNWBq6rk=',
      },
    },
  ],
};



