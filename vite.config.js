export default {
  // Vite config for the workshop app
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html',
        dashboard: 'dashboard.html',
        admin: 'admin.html'
      },
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/database', 'firebase/analytics']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
}
