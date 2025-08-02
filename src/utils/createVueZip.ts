import JSZip from 'jszip'
import { encode as arrayBufferToBase64 } from 'base64-arraybuffer'

interface VueZipConfig {
  buffers: Map<string, ArrayBuffer>
  code: string
  fileName: string
  types?: boolean
  useComposition?: boolean
  isNuxt?: boolean
  shadows?: boolean
  autoRotate?: boolean
  contactShadow?: boolean
  environment?: string
  preset?: string
  intensity?: number
}

export async function createVueZip(config: VueZipConfig): Promise<Blob> {
  const zip = new JSZip()
  const { buffers, code, fileName, types = true, useComposition = true, isNuxt = false } = config

  if (isNuxt) {
    // Generate Nuxt 3 project structure
    return generateNuxtProject(zip, config)
  } else {
    // Generate Vue 3 project structure
    return generateVue3Project(zip, config)
  }
}

function generateNuxtProject(zip: JSZip, config: VueZipConfig): Promise<Blob> {
  const { buffers, code, fileName, types, useComposition } = config

  // Nuxt configuration
  zip.file('nuxt.config.ts', generateNuxtConfig(types ?? true))
  
  // Package.json for Nuxt
  zip.file('package.json', JSON.stringify(generateNuxtPackageJson(types ?? true), null, 2))

  // App.vue
  zip.file('app.vue', generateNuxtAppVue(config))

  // Pages
  zip.file('pages/index.vue', generateNuxtIndexPage(config))

  // Components
  const componentName = getComponentName(fileName)
  const componentPath = `components/${componentName}.vue`
  zip.file(componentPath, code)

  // TresJS Nuxt plugin
  zip.file('plugins/tres.client.ts', generateTresPlugin())

  // Public assets
  if (buffers) {
    buffers.forEach((buffer, path) => {
      zip.file(`public/${path}`, arrayBufferToBase64(buffer), { base64: true })
    })
  }

  // Styles
  zip.file('assets/css/main.css', generateMainCSS())

  // TypeScript config (if needed)
  if (types) {
    zip.file('tsconfig.json', JSON.stringify(generateTSConfig(), null, 2))
  }

  // README
  zip.file('README.md', generateNuxtReadme(fileName))

  return zip.generateAsync({ type: 'blob' })
}

function generateVue3Project(zip: JSZip, config: VueZipConfig): Promise<Blob> {
  const { buffers, code, fileName, types, useComposition } = config

  // Package.json for Vue 3
  zip.file('package.json', JSON.stringify(generateVue3PackageJson(types ?? true), null, 2))

  // Vite config
  zip.file('vite.config.ts', generateViteConfig(types ?? true))

  // HTML template
  zip.file('index.html', generateIndexHTML())

  // Main entry
  zip.file(`src/main.${types ? 'ts' : 'js'}`, generateMainEntry(types ?? true))

  // App.vue
  zip.file('src/App.vue', generateVue3AppVue(config))

  // Components
  const componentName = getComponentName(fileName)
  const componentPath = `src/components/${componentName}.vue`
  zip.file(componentPath, code)

  // Public assets
  if (buffers) {
    buffers.forEach((buffer, path) => {
      zip.file(`public/${path}`, arrayBufferToBase64(buffer), { base64: true })
    })
  }

  // Styles
  zip.file('src/style.css', generateMainCSS())

  // TypeScript config (if needed)
  if (types) {
    zip.file('tsconfig.json', JSON.stringify(generateTSConfig(), null, 2))
  }

  // README
  zip.file('README.md', generateVue3Readme(fileName))

  return zip.generateAsync({ type: 'blob' })
}

function generateNuxtConfig(types: boolean): string {
  return `export default defineNuxtConfig({
  devtools: { enabled: true },
  ${types ? 'typescript: { typeCheck: true },' : ''}
  modules: [
    '@tresjs/nuxt'
  ],
  tres: {
    glsl: true
  },
  css: ['~/assets/css/main.css']
})`
}

function generateNuxtPackageJson(types: boolean): object {
  const baseDeps = {
    "nuxt": "^3.8.0",
    "@tresjs/nuxt": "^2.0.0",
    "@tresjs/core": "^3.0.0",
    "@tresjs/cientos": "^3.0.0",
    "three": "^0.163.0"
  }

  const devDeps = types ? {
    "@nuxt/devtools": "latest",
    "typescript": "^5.2.0"
  } : {
    "@nuxt/devtools": "latest"
  }

  return {
    name: "nuxt-tres-gltf-viewer",
    private: true,
    scripts: {
      build: "nuxt build",
      dev: "nuxt dev",
      generate: "nuxt generate",
      preview: "nuxt preview",
      postinstall: "nuxt prepare"
    },
    dependencies: baseDeps,
    devDependencies: devDeps
  }
}

function generateVue3PackageJson(types: boolean): object {
  const baseDeps = {
    "vue": "^3.3.0",
    "@tresjs/core": "^3.0.0",
    "@tresjs/cientos": "^3.0.0",
    "three": "^0.163.0"
  }

  const devDeps = types ? {
    "@vitejs/plugin-vue": "^4.0.0",
    "typescript": "^5.2.0",
    "vue-tsc": "^1.8.0",
    "vite": "^4.0.0"
  } : {
    "@vitejs/plugin-vue": "^4.0.0",
    "vite": "^4.0.0"
  }

  return {
    name: "vue3-tres-gltf-viewer",
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: types ? "vue-tsc && vite build" : "vite build",
      preview: "vite preview"
    },
    dependencies: baseDeps,
    devDependencies: devDeps
  }
}

function generateNuxtAppVue(config: VueZipConfig): string {
  return `<template>
  <div>
    <NuxtPage />
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>`
}

function generateNuxtIndexPage(config: VueZipConfig): string {
  const componentName = getComponentName(config.fileName)
  const { environment = 'city', preset = 'rembrandt', intensity = 1, autoRotate = false } = config

  return `<template>
  <div class="scene-container">
    <TresCanvas v-bind="gl" window-size>
      <TresPerspectiveCamera :position="[0, 0, 5]" :fov="50" />
      
      <Suspense>
        <TresGroup>
          <${componentName} />
        </TresGroup>
      </Suspense>
      
      <TresAmbientLight :intensity="0.5" />
      <TresDirectionalLight :position="[10, 10, 5]" :intensity="1" />
      
      <OrbitControls ${autoRotate ? 'auto-rotate' : ''} />
    </TresCanvas>
  </div>
</template>

<script setup${config.types ? ' lang="ts"' : ''}>
import { OrbitControls } from '@tresjs/cientos'
import ${componentName} from '~/components/${componentName}.vue'

const gl = {
  clearColor: '#1a1a1a',
  shadows: ${config.shadows || false},
  alpha: false,
  powerPreference: 'high-performance',
}
</script>

<style scoped>
.scene-container {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>`
}

function generateVue3AppVue(config: VueZipConfig): string {
  const componentName = getComponentName(config.fileName)
  const { autoRotate = false } = config

  return `<template>
  <div class="scene-container">
    <TresCanvas v-bind="gl" window-size>
      <TresPerspectiveCamera :position="[0, 0, 5]" :fov="50" />
      
      <Suspense>
        <TresGroup>
          <${componentName} />
        </TresGroup>
      </Suspense>
      
      <TresAmbientLight :intensity="0.5" />
      <TresDirectionalLight :position="[10, 10, 5]" :intensity="1" />
      
      <OrbitControls ${autoRotate ? 'auto-rotate' : ''} />
    </TresCanvas>
  </div>
</template>

<script setup${config.types ? ' lang="ts"' : ''}>
import { OrbitControls } from '@tresjs/cientos'
import ${componentName} from './components/${componentName}.vue'

const gl = {
  clearColor: '#1a1a1a',
  shadows: ${config.shadows || false},
  alpha: false,
  powerPreference: 'high-performance',
}
</script>

<style scoped>
.scene-container {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>`
}

function generateViteConfig(types: boolean): string {
  return `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: ['three']
  }
})`
}

function generateIndexHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vue 3 + TresJS GLTF Viewer</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`
}

function generateMainEntry(types: boolean): string {
  return `import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')`
}

function generateTresPlugin(): string {
  return `import { Tres } from '@tresjs/core'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Tres)
})`
}

function generateMainCSS(): string {
  return `html,
body,
#app {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #000;
}

* {
  box-sizing: border-box;
}`
}

function generateTSConfig(): object {
  return {
    compilerOptions: {
      target: "ES2020",
      useDefineForClassFields: true,
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      skipLibCheck: true,
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "preserve",
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true
    },
    include: ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
    references: [{ path: "./tsconfig.node.json" }]
  }
}

function generateNuxtReadme(fileName: string): string {
  return `# Nuxt 3 + TresJS GLTF Viewer

This project was generated from GLTF file: \\\`${fileName}\\\`

## Setup

\`\`\`bash
npm install
\`\`\`

## Development Server

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Features

- 🚀 Nuxt 3
- 🎨 TresJS (Three.js for Vue)
- 📦 Auto-generated GLTF component
- 🎮 Orbit controls
- 💡 Lighting setup
- 📱 Responsive design

## Usage

The GLTF model has been converted to a Vue component that you can easily customize and reuse in your Nuxt application.
`
}

function generateVue3Readme(fileName: string): string {
  return `# Vue 3 + TresJS GLTF Viewer

This project was generated from GLTF file: \`${fileName}\`

## Setup

\`\`\`bash
npm install
\`\`\`

## Development Server

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Features

- ⚡ Vue 3 + Vite
- 🎨 TresJS (Three.js for Vue)
- 📦 Auto-generated GLTF component
- 🎮 Orbit controls
- 💡 Lighting setup
- 📱 Responsive design

## Usage

The GLTF model has been converted to a Vue component that you can easily customize and reuse in your Vue application.
`
}

function getComponentName(fileName: string): string {
  const baseName = fileName.split('/').pop()?.split('.')[0] || 'Model'
  return baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/[^a-zA-Z0-9]/g, '')
}