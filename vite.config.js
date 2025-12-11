import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Fast Refresh for React 19
      fastRefresh: true,
      
      // Babel options
      babel: {
        plugins: [],
      },
    }),
  ],
  
  // Path aliases for clean imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // Development server configuration
  server: {
    port: 3000,
    host: true,
    open: true,
    strictPort: false,
    
    // CORS for development
    cors: true,
    
    // Proxy configuration if needed for backend API
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8080',
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/api/, '')
    //   }
    // }
  },
  
  // Build configuration
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate sourcemaps for production debugging
    sourcemap: true,
    
    // Chunk size warning limit (500kb)
    chunkSizeWarningLimit: 500,
    
    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: {
          // Vendor chunk for React and core libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // Vendor chunk for UI libraries
          'vendor-ui': [
            'lucide-react',
            'sonner',
            'clsx',
            'tailwind-merge',
          ],
          
          // Vendor chunk for forms
          'vendor-forms': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod',
          ],
          
          // Vendor chunk for Web3/Blockchain
          'vendor-web3': [
            'ethers',
          ],
        },
      },
    },
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
      },
    },
  },
  
  // Optimizations
  optimizeDeps: {
    // Include dependencies that need pre-bundling
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'ethers',
      'lucide-react',
      'sonner',
    ],
    
    // Exclude external SDKs loaded via CDN
    exclude: [
      '@zama-fhe/relayer-sdk',
    ],
  },
  
  // Preview server (for production build testing)
  preview: {
    port: 4173,
    host: true,
    strictPort: false,
    open: true,
  },
  
  // Define environment variables
  define: {
    // Expose app version
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  
  // CSS configuration
  css: {
    // PostCSS configuration will be picked up from postcss.config.js
    postcss: './postcss.config.js',
  },
});