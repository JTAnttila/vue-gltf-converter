export default defineNuxtConfig({
  devtools: { enabled: true },
  
  // TypeScript configuration
  typescript: {
    typeCheck: true
  },

  // Modules
  modules: [
    '@tresjs/nuxt',
    '@pinia/nuxt'
  ],

  // TresJS configuration
  tres: {
    glsl: true,
    devtools: true
  },

  // CSS
  css: ['~/assets/css/main.css'],

  // Build configuration
  build: {
    transpile: ['three', 'three-stdlib']
  },

  // Vite configuration for Nuxt
  vite: {
    optimizeDeps: {
      include: [
        'three',
        'three/examples/jsm/loaders/GLTFLoader.js',
        'three/examples/jsm/loaders/DRACOLoader.js',
        'three/examples/jsm/loaders/KTX2Loader.js',  // Add KTX2Loader
        'three/examples/jsm/libs/meshopt_decoder.module.js',
        'three-stdlib'
      ],
      exclude: [
        // Exclude worker-related modules that can cause issues in SSR
        'three/examples/jsm/libs/draco/draco_wasm_wrapper.js'
      ]
    },
    define: {
      global: 'globalThis',
    },
    server: {
      // Prevent pre-bundling of worker files
      fs: {
        allow: ['..']
      }
    }
  },

  // Runtime config
  runtimeConfig: {
    public: {
      appName: 'Vue GLTF Converter',
      version: '1.0.0'
    }
  },

  // App configuration
  app: {
    head: {
      title: 'Vue GLTF Converter',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { 
          name: 'description', 
          content: 'Convert GLTF models to Vue 3 / Nuxt TresJS components' 
        }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  // Nitro configuration
  nitro: {
    preset: 'static'
  }
})