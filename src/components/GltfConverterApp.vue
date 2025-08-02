<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="container">
        <h1 class="title">
          <span class="gradient-text">GLTF → Vue 3 / Nuxt</span>
        </h1>
        <p class="subtitle">
          Convert GLTF models into TresJS components for Vue 3 and Nuxt projects
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main">
      <div class="container">
        <!-- File Upload Section -->
        <section v-if="!store.hasScene" class="upload-section">
          <div class="upload-area">
            <FileUploader @files-uploaded="handleFilesUploaded" />
          </div>
        </section>

        <!-- Viewer and Controls Section -->
        <section v-else class="viewer-section">
          <div class="viewer-grid">
            <!-- 3D Viewer -->
            <div class="viewer-container">
              <GltfViewer 
                :scene="store.scene"
                :shadows="config.shadows"
                :contact-shadow="config.contactShadow"
                :auto-rotate="config.autoRotate"
                :environment="config.environment"
                :preset="config.preset"
                :intensity="config.intensity"
              />
            </div>

            <!-- Configuration Panel -->
            <aside class="config-panel">
              <div class="panel-header">
                <h2>Configuration</h2>
                <button 
                  @click="store.reset()"
                  class="btn btn-secondary btn-sm"
                >
                  New Model
                </button>
              </div>

              <!-- Generation Settings -->
              <div class="config-section">
                <h3>Generation Settings</h3>
                
                <label class="checkbox-label">
                  <input 
                    v-model="config.types" 
                    type="checkbox"
                  />
                  TypeScript
                </label>
                
                <label class="checkbox-label">
                  <input 
                    v-model="config.useComposition" 
                    type="checkbox"
                  />
                  Composition API
                </label>
                
                <label class="checkbox-label">
                  <input 
                    v-model="config.instanceall" 
                    type="checkbox"
                  />
                  Use Instances
                </label>

                <div class="form-group">
                  <label>Framework:</label>
                  <select v-model="config.framework" class="form-control">
                    <option value="vue3">Vue 3 + Vite</option>
                    <option value="nuxt">Nuxt 3</option>
                  </select>
                </div>
              </div>

              <!-- Scene Settings -->
              <div class="config-section">
                <h3>Scene Settings</h3>
                
                <label class="checkbox-label">
                  <input 
                    v-model="config.shadows" 
                    type="checkbox"
                  />
                  Shadows
                </label>
                
                <label class="checkbox-label">
                  <input 
                    v-model="config.contactShadow" 
                    type="checkbox"
                  />
                  Contact Shadow
                </label>
                
                <label class="checkbox-label">
                  <input 
                    v-model="config.autoRotate" 
                    type="checkbox"
                  />
                  Auto Rotate
                </label>

                <div class="form-group">
                  <label>Environment:</label>
                  <select v-model="config.environment" class="form-control">
                    <option value="sunset">Sunset</option>
                    <option value="dawn">Dawn</option>
                    <option value="night">Night</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="forest">Forest</option>
                    <option value="apartment">Apartment</option>
                    <option value="studio">Studio</option>
                    <option value="city">City</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Preset:</label>
                  <select v-model="config.preset" class="form-control">
                    <option value="rembrandt">Rembrandt</option>
                    <option value="portrait">Portrait</option>
                    <option value="upfront">Upfront</option>
                    <option value="soft">Soft</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Intensity: {{ config.intensity }}</label>
                  <input 
                    v-model.number="config.intensity" 
                    type="range" 
                    min="0" 
                    max="2" 
                    step="0.1"
                    class="range-control"
                  />
                </div>
              </div>

              <!-- Actions -->
              <div class="config-section">
                <h3>Export</h3>
                
                <button 
                  @click="generateCode"
                  :disabled="store.isLoading || !store.hasBuffers"
                  class="btn btn-primary btn-block"
                >
                  {{ store.isLoading ? 'Generating...' : 'Generate Component' }}
                </button>
                
                <button 
                  @click="downloadProject"
                  :disabled="!store.hasCode || store.isLoading"
                  class="btn btn-success btn-block"
                >
                  Download {{ config.framework === 'nuxt' ? 'Nuxt' : 'Vue 3' }} Project
                </button>
              </div>
            </aside>
          </div>

          <!-- Code Preview -->
          <section v-if="store.hasCode" class="code-section">
            <div class="code-header">
              <h3>Generated Component</h3>
              <button 
                @click="copyCode"
                class="btn btn-secondary"
              >
                {{ codeCopied ? 'Copied!' : 'Copy Code' }}
              </button>
            </div>
            <CodePreview :code="store.code" />
          </section>
        </section>
      </div>
    </main>

    <!-- Loading Overlay -->
    <div v-if="store.isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- Error Toast -->
    <Transition name="toast">
      <div v-if="store.error" class="error-toast">
        <p>{{ store.error }}</p>
        <button @click="store.clearError()" class="toast-close">×</button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGltfStore } from '../stores/useGltfStore'
import GltfViewer from './GltfViewer.vue'
import FileUploader from './FileUploader.vue'
import CodePreview from './CodePreview.vue'

// Store
const store = useGltfStore()

// Local state
const codeCopied = ref(false)

// Configuration
const config = ref({
  types: true,
  useComposition: true,
  shadows: true,
  autoRotate: false,
  contactShadow: true,
  environment: 'city',
  preset: 'rembrandt',
  intensity: 1,
  instanceall: false,
  framework: 'vue3' as 'vue3' | 'nuxt'
})

// Computed
const loadingMessage = computed(() => {
  if (store.isLoading) {
    return store.hasCode ? 'Creating project...' : 'Processing GLTF...'
  }
  return ''
})

// Methods
async function handleFilesUploaded(files: { buffers: Map<string, ArrayBuffer>, fileName: string }) {
  try {
    store.setBuffers(files.buffers)
    store.setFileName(files.fileName)
    
    // Auto-generate the scene
    await generateCode()
  } catch (error) {
    console.error('Error handling uploaded files:', error)
  }
}

async function generateCode() {
  try {
    await store.generateVueScene({
      fileName: store.fileName,
      types: config.value.types,
      useComposition: config.value.useComposition,
      shadows: config.value.shadows,
      autoRotate: config.value.autoRotate,
      contactShadow: config.value.contactShadow,
      environment: config.value.environment,
      preset: config.value.preset,
      intensity: config.value.intensity,
      instanceall: config.value.instanceall
    })
  } catch (error) {
    console.error('Error generating code:', error)
  }
}

async function downloadProject() {
  if (!store.hasCode || !store.buffers) return

  try {
    const sandboxConfig = {
      buffers: store.buffers,
      code: store.code,
      fileName: store.fileName,
      types: config.value.types,
      useComposition: config.value.useComposition,
      isNuxt: config.value.framework === 'nuxt',
      shadows: config.value.shadows,
      autoRotate: config.value.autoRotate,
      contactShadow: config.value.contactShadow,
      environment: config.value.environment,
      preset: config.value.preset,
      intensity: config.value.intensity
    }

    await store.createVueZip({ sandboxCode: sandboxConfig })
  } catch (error) {
    console.error('Error downloading project:', error)
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(store.code)
    codeCopied.value = true
    setTimeout(() => {
      codeCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy code:', error)
  }
}

// Watch for config changes and auto-regenerate
watch(
  () => [
    config.value.types,
    config.value.useComposition,
    config.value.shadows,
    config.value.autoRotate,
    config.value.contactShadow,
    config.value.environment,
    config.value.preset,
    config.value.intensity,
    config.value.instanceall
  ],
  async () => {
    if (store.hasBuffers && !store.isLoading) {
      await generateCode()
    }
  },
  { deep: true }
)
</script>

<style scoped>
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #333;
}

.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 2rem 0;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

.title {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  text-align: center;
}

.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.2rem;
  text-align: center;
  color: #666;
  margin: 0;
}

.main {
  padding: 2rem 0;
}

.upload-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.upload-area {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 3rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.viewer-section {
  space-y: 2rem;
}

.viewer-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 2rem;
  margin-bottom: 2rem;
}

.viewer-container {
  height: 600px;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.config-panel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  height: fit-content;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.config-section {
  margin-bottom: 2rem;
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #555;
}

.checkbox-label {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
  cursor: pointer;
  font-size: 0.95rem;
}

.checkbox-label input {
  margin-right: 0.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
}

.range-control {
  width: 100%;
  margin: 0.5rem 0;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.btn-success {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(79, 172, 254, 0.3);
}

.btn-secondary {
  background: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
}

.btn-secondary:hover:not(:disabled) {
  background: #e9ecef;
}

.btn-block {
  width: 100%;
  margin-bottom: 0.75rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
}

.code-section {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.code-header h3 {
  margin: 0;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.loading-spinner {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #ff6b6b;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 8px 16px rgba(255, 107, 107, 0.3);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 400px;
}

.error-toast p {
  margin: 0;
  font-size: 0.9rem;
}

.toast-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@media (max-width: 1024px) {
  .viewer-grid {
    grid-template-columns: 1fr;
  }
  
  .viewer-container {
    height: 400px;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }
  
  .title {
    font-size: 2rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
  
  .config-panel {
    padding: 1rem;
  }
}
</style>
