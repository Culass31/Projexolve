
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    
    // Configuration du serveur de développement
    server: {
      port: 5173,
      host: true,
      open: true
    },
    
    // Configuration du build
    build: {
      target: 'es2015',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProduction,
      minify: isProduction ? 'terser' : 'esbuild',
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      } : {},
      
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: {
            // Séparer les vendors pour un meilleur cache
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            dnd: ['react-beautiful-dnd'],
            utils: ['date-fns', 'd3']
          }
        }
      },
      
      // Optimisations
      chunkSizeWarningLimit: 1000
    },
    
    // Configuration des alias
    resolve: {
      alias: {
        'react': resolve(__dirname, './node_modules/react'),
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@pages': resolve(__dirname, './src/pages'),
        '@utils': resolve(__dirname, './src/utils'),
        '@contexts': resolve(__dirname, './src/contexts'),
        '@styles': resolve(__dirname, './src/styles')
      }
    },
    
    // Variables d'environnement
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    
    // Configuration CSS
    css: {
      devSourcemap: true,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      }
    },
    
    // Optimisation des dépendances
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'react-router-dom',
        '@supabase/supabase-js',
        'react-beautiful-dnd',
        'date-fns'
      ]
    }
  }
});
