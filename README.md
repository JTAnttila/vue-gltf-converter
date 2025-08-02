
# Vue GLTF Converter

A powerful web application that converts GLTF/GLB 3D models into Vue 3 and Nuxt 3 components using TresJS (Three.js for Vue). Transform your 3D models into production-ready Vue components with real-time preview, customizable settings, and automated project generation.

![Vue GLTF Converter](https://img.shields.io/badge/Vue-3-4FC08D?style=flat&logo=vue.js&logoColor=white)
![TresJS](https://img.shields.io/badge/TresJS-Three.js%20for%20Vue-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

### Core Functionality

* **🎨 Real-time 3D Preview** - Interactive preview with orbit controls, shadows, and lighting
* **⚡ Instant Code Generation** - Converts GLTF/GLB to Vue/Nuxt components in seconds
* **📦 Complete Project Export** - Downloads full Vue 3 or Nuxt 3 projects as ZIP files
* **🎮 Interactive Configuration** - Live settings panel with instant preview updates
* **📱 Responsive Design** - Works seamlessly across desktop and mobile devices

### Supported Formats

* **GLTF 2.0** (.gltf with separate .bin/.jpg/.png files)
* **GLB** (Binary GLTF - single file)
* **Draco Compression** - Automatic detection and decompression
* **KTX2 Textures** - Advanced texture compression support
* **Meshopt Compression** - Mesh optimization support

### Framework Support

* **Vue 3** with Vite
* **Nuxt 3** with SSR/SSG support
* **TypeScript** - Full type safety (optional)
* **TresJS** - Vue 3 Three.js integration

## 🛠️ Installation & Setup

### Prerequisites

* Node.js 18+
* npm or yarn package manager

### Quick Start

```bash
# Clone the repository
git clone https://github.com/JTAnttila/vue-gltf-converter.git
cd vue-gltf-converter

# Install dependencies
npm install

# Start development server
npm run dev

# Or for Nuxt development
npm run dev:nuxt
```

### Build for Production

```bash
# Build Vue 3 version
npm run build

# Build Nuxt 3 version  
npm run build:nuxt

# Generate static site (Nuxt)
npm run generate:nuxt
```

## 📖 Usage Guide

### Basic Workflow

1. **Upload Your Model**
   * Drag & drop GLTF/GLB files into the upload area
   * Or click to browse and select files
   * Supports multi-file GLTF with textures and dependencies
2. **Configure Settings**
   * Adjust generation options in the right panel
   * See changes reflected in real-time preview
   * Toggle TypeScript, shadows, animations, and more
3. **Preview & Iterate**
   * Use the 3D viewer to inspect your model
   * Orbit controls: Left click + drag to rotate
   * Zoom: Mouse wheel or pinch gesture
   * Pan: Right click + drag or Shift + left click + drag
4. **Export Your Project**
   * Copy generated Vue component code
   * Download complete Vue 3 or Nuxt 3 project
   * Import into your existing application

### Configuration Options

#### Code Generation

* **Types** - Generate TypeScript components with full type safety
* **Shadows** - Enable shadow casting and receiving
* **Instance All** - Use instanced rendering for performance optimization
* **Verbose** - Include detailed comments in generated code
* **Keep Names** - Preserve original object names from GLTF
* **Keep Groups** - Maintain object hierarchy and grouping
* **Meta** - Include metadata and custom properties

#### Scene Settings

* **Auto Rotate** - Automatically rotate the model for presentation
* **Contact Shadow** - Add ground contact shadows
* **Environment** - Choose HDR environment map (city, forest, studio, etc.)
* **Lighting Preset** - Select lighting setup (rembrandt, studio, warehouse, etc.)
* **Intensity** - Control overall lighting intensity
* **Precision** - Decimal precision for numerical values

#### Framework Target

* **Vue 3** - Generate Vite-based Vue 3 project
* **Nuxt 3** - Generate SSR/SSG-ready Nuxt 3 project

## 🎯 Power User Guide

### Advanced Features

#### Multi-File GLTF Support

When uploading GLTF files with external dependencies:

```
my-model.gltf        # Main file
my-model.bin         # Binary data  
textures/diffuse.jpg # Texture files
textures/normal.png  # Additional assets
```

The converter automatically resolves all dependencies and includes them in the output.

#### Custom Draco Decoding

For models with Draco compression:

* Automatic detection and decompression
* Uses Google's Draco decoder for optimal performance
* No additional setup required

#### KTX2 Texture Support

Advanced texture compression handling:

* Basis Universal transcoding
* Automatic format selection based on GPU capabilities
* Fallback to standard formats when needed

### Generated Project Structure

#### Vue 3 Project

```
project-name/
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
├── index.html           # HTML template
├── tsconfig.json        # TypeScript config (if enabled)
├── src/
│   ├── main.ts          # Application entry point
│   ├── App.vue          # Main app component
│   ├── style.css        # Global styles
│   └── components/
│       └── ModelName.vue # Your generated 3D component
└── public/
    ├── model.gltf       # Your 3D model files
    └── assets/          # Textures and dependencies
```

#### Nuxt 3 Project

```
project-name/
├── package.json         # Dependencies and scripts
├── nuxt.config.ts       # Nuxt configuration
├── tsconfig.json        # TypeScript config (if enabled)
├── app.vue             # Root app component
├── pages/
│   └── index.vue        # Home page with your model
├── components/
│   └── ModelName.vue    # Your generated 3D component
├── plugins/
│   └── tres.client.ts   # TresJS plugin setup
├── assets/
│   └── css/
│       └── main.css     # Global styles
└── public/
    ├── model.gltf       # Your 3D model files
    └── assets/          # Textures and dependencies
```

### Performance Optimization Tips

#### 1. Use Draco Compression

* Reduces file size by 90%+ for complex geometries
* Automatic decompression in browser
* Faster loading times

#### 2. Enable Instancing

* Use "Instance All" for models with repeated geometry
* Significant performance boost for complex scenes
* Ideal for architectural visualizations

#### 3. Optimize Textures

* Use KTX2 format for smallest file sizes
* Power-of-2 dimensions for better GPU compatibility
* Consider texture atlasing for multiple materials

#### 4. Shadow Configuration

* Disable shadows for performance-critical applications
* Use contact shadows only when needed
* Adjust shadow map resolution based on requirements

### Integration Examples

#### Vue 3 Component Usage

```vue
<template>
  <div class="scene-container">
    <TresCanvas v-bind="gl">
      <TresPerspectiveCamera :position="[3, 3, 3]" />
      <OrbitControls enableDamping />
      <TresAmbientLight :intensity="0.5" />
      <TresDirectionalLight :position="[0, 2, 4]" :intensity="1" cast-shadow />
    
      <!-- Your generated component -->
      <MyModel />
    </TresCanvas>
  </div>
</template>

<script setup>
import { OrbitControls } from '@tresjs/cientos'
import MyModel from './components/MyModel.vue'

const gl = {
  clearColor: '#1a1a1a',
  shadows: true,
  alpha: false,
}
</script>
```

#### Nuxt 3 Page Example

```vue
<template>
  <div>
    <TresCanvas v-bind="gl">
      <TresPerspectiveCamera :position="[5, 5, 5]" />
      <OrbitControls enableDamping />
    
      <!-- Lighting setup -->
      <TresAmbientLight :intensity="0.3" />
      <TresDirectionalLight :position="[10, 10, 5]" cast-shadow />
    
      <!-- Your model component -->
      <ClientOnly>
        <MyModel />
      </ClientOnly>
    </TresCanvas>
  </div>
</template>

<script setup>
import { OrbitControls } from '@tresjs/cientos'

// Nuxt-specific setup
definePageMeta({
  title: 'My 3D Model'
})

const gl = {
  clearColor: '#2a2a2a',
  shadows: true,
  powerPreference: 'high-performance'
}
</script>
```

### Troubleshooting

#### Common Issues

**Model appears black/unlit:**

* Check if materials have proper textures
* Ensure lighting is configured
* Verify normal maps are correctly applied

**Performance issues:**

* Enable Draco compression
* Reduce texture resolution
* Use instancing for repeated objects
* Disable shadows if not needed

**TypeScript errors:**

* Ensure @types packages are installed
* Check tsconfig.json configuration
* Verify TresJS type definitions

**Loading errors:**

* Check file paths in public directory
* Verify all dependencies are included
* Ensure proper CORS headers for external assets

## 🔧 API Reference

### Configuration Interface

```typescript
interface GltfConverterConfig {
  // Code generation
  types: boolean           // Generate TypeScript
  shadows: boolean         // Enable shadows
  instanceall: boolean     // Instance repeated geometry
  verbose: boolean         // Detailed code comments
  keepNames: boolean       // Preserve GLTF names
  keepGroups: boolean      // Maintain hierarchy
  meta: boolean           // Include metadata
  precision: number       // Decimal precision
  
  // Scene settings
  pathPrefix: string      // Asset path prefix
  autoRotate: boolean     // Auto-rotation
  contactShadow: boolean  // Ground shadows
  intensity: number       // Lighting intensity
  preset: string         // Lighting preset
  environment: string    // HDR environment
  
  // Framework
  framework: 'vue3' | 'nuxt'  // Target framework
}
```

### Store Interface

```typescript
interface GltfStore {
  // State
  isLoading: boolean
  error: string | null
  fileName: string
  code: string
  buffers: Map<string, ArrayBuffer>
  
  // Actions
  setBuffers(buffers: Map<string, ArrayBuffer>, fileName: string): void
  generateVueScene(config: GltfConverterConfig): Promise<void>
  downloadVueProject(config: GltfConverterConfig): Promise<void>
  reset(): void
  clearError(): void
}
```

## 📚 Learning Resources

### TresJS Documentation

* [Official TresJS Docs](https://tresjs.org/)
* [TresJS Examples](https://tresjs.org/examples/)
* [TresJS Cientos Components](https://cientos.tresjs.org/)

### Three.js Resources

* [Three.js Documentation](https://threejs.org/docs/)
* [Three.js Examples](https://threejs.org/examples/)
* [GLTF 2.0 Specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)

### Vue & Nuxt

* [Vue 3 Documentation](https://vuejs.org/)
* [Nuxt 3 Documentation](https://nuxt.com/)
* [Composition API Guide](https://vuejs.org/guide/extras/composition-api-faq.html)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://claude.ai/chat/CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/yourusername/vue-gltf-converter.git

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Reporting Issues

* Use the [Issue Tracker](https://github.com/JTAnttila/vue-gltf-converter/issues)
* Include model files when possible
* Describe expected vs actual behavior
* Provide browser and system information

## 📄 License

MIT License - see [LICENSE](https://claude.ai/chat/LICENSE) file for details.

## 🙏 Acknowledgments

* [TresJS Team](https://github.com/Tresjs) for the amazing Vue Three.js integration
* [Three.js Contributors](https://github.com/mrdoob/three.js/) for the foundational 3D engine
* [Vue.js Team](https://github.com/vuejs) for the reactive framework
* [Nuxt Team](https://github.com/nuxt) for the full-stack framework
* [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) for GLTF parsing capabilities

---

**Made with ❤️ by [JTAnttila](https://github.com/JTAnttila)**

*Transform your 3D models into Vue magic!* ✨
