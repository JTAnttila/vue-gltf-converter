import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { templateCompilerOptions } from '@tresjs/core'

export default defineConfig({
  plugins: [
    vue({
      ...templateCompilerOptions
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/loaders/GLTFLoader.js',
      'three/examples/jsm/loaders/DRACOLoader.js',
      'three/examples/jsm/libs/meshopt_decoder.module.js',
      'three-stdlib',
      '@tresjs/core',
      '@tresjs/cientos'
    ],
  },
  define: {
    global: 'globalThis',
  },
  server: {
    host: true,
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'three-stdlib': ['three-stdlib'],
          'vue-vendor': ['vue', 'pinia'],
          'tres': ['@tresjs/core', '@tresjs/cientos']
        }
      }
    }
  }
})