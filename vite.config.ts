
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Modern build optimizations
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    
    // Code splitting optimization
    rollupOptions: {
      output: {
        // Optimal chunk splitting for caching
        manualChunks: {
          // Vendor chunks for long-term caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-accordion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'query-vendor': ['@tanstack/react-query'],
          // Component chunks
          'admin-components': [
            './src/pages/AdminDashboard.tsx',
            './src/components/admin/AdminInvitationManager.tsx',
            './src/components/admin/ClientInvitationManager.tsx',
            './src/components/admin/PortalContentManager.tsx'
          ],
          'client-components': [
            './src/pages/ClientPortal.tsx',
            './src/components/client-portal/AnnouncementCard.tsx',
            './src/components/client-portal/ResourceCard.tsx'
          ]
        },
        // Content-based file naming for immutable caching
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name?.includes('vendor')) {
            return 'assets/vendor/[name]-[hash].js';
          }
          return 'assets/chunks/[name]-[hash].js';
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/styles/[name]-[hash][extname]';
          }
          if (/\.(png|jpe?g|svg|gif|webp|avif)$/i.test(assetInfo.name || '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    
    // Performance budgets
    chunkSizeWarningLimit: 1000,
    
    // Source maps for production debugging
    sourcemap: mode === 'production' ? 'hidden' : true,
    
    // Asset inlining threshold
    assetsInlineLimit: 4096,
  },
  
  // Optimization options
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'date-fns',
      'lucide-react'
    ],
    exclude: ['@radix-ui/react-*']
  },
  
  // Performance optimizations
  esbuild: {
    // Remove console.log in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  
  // Preview configuration for production testing
  preview: {
    port: 8080,
    host: true,
    headers: {
      // Cache headers for static assets
      'Cache-Control': 'public, max-age=31536000, immutable',
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  }
}));
