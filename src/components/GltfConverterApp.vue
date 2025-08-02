<template>
  <div class="gltf-converter-app">
    <!-- Header -->
    <header class="app-header">
      <h1>Vue GLTF Converter</h1>
      <p>Convert GLTF models to Vue 3 / Nuxt TresJS components</p>
    </header>

    <!-- Main Content -->
    <main class="app-main">
      <!-- File Upload Section -->
      <section class="upload-section">
        <FileUploader @files-uploaded="handleFilesUploaded" />
        
        <!-- Loading Message -->
        <div v-if="store.isLoading" class="loading-message">
          <div class="spinner"></div>
          <p>{{ loadingMessage }}</p>
        </div>
        
        <!-- Error Message -->
        <div v-if="store.error" class="error-message">
          <p>{{ store.error }}</p>
          <button @click="store.clearError()" class="close-error">×</button>
        </div>
      </section>

      <!-- Configuration Panel -->
      <section v-if="store.fileName" class="config-section">
        <h3>Configuration</h3>
        <div class="config-grid">
          <div class="config-group">
            <label class="checkbox-label">
              <input v-model="config.types" type="checkbox" />
              <span>TypeScript</span>
            </label>
            <label class="checkbox-label">
              <input v-model="config.useComposition" type="checkbox" />
              <span>Composition API</span>
            </label>
            <label class="checkbox-label">
              <input v-model="config.shadows" type="checkbox" />
              <span>Shadows</span>
            </label>
            <label class="checkbox-label">
              <input v-model="config.autoRotate" type="checkbox" />
              <span>Auto Rotate</span>
            </label>
          </div>
          
          <div class="config-group">
            <label class="select-label">
              <span>Framework:</span>
              <select v-model="config.framework">
                <option value="vue3">Vue 3</option>
                <option value="nuxt">Nuxt 3</option>
              </select>
            </label>
            
            <label class="select-label">
              <span>Environment:</span>
              <select v-model="config.environment">
                <option value="city">City</option>
                <option value="studio">Studio</option>
                <option value="sunset">Sunset</option>
                <option value="dawn">Dawn</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <!-- Results Section -->
      <section v-if="store.code" class="results-section">
        <div class="results-grid">
          <!-- 3D Viewer -->
          <div class="viewer-panel">
            <h3>3D Preview</h3>
            <GltfViewer v-if="store.scene" />
            <div v-else class="viewer-placeholder">
              <p>3D preview will appear here</p>
            </div>
          </div>

          <!-- Code Preview -->
          <div class="code-panel">
            <div class="code-header">
              <h3>Generated Vue Component</h3>
              <div class="code-actions">
                <button @click="copyCode" class="btn-secondary" :class="{ copied: codeCopied }">
                  {{ codeCopied ? 'Copied!' : 'Copy Code' }}
                </button>
                <button @click="downloadProject" class="btn-primary" :disabled="store.isLoading">
                  Download Project
                </button>
              </div>
            </div>
            <CodePreview :code="store.code" :language="config.types ? 'typescript' : 'javascript'" />
          </div>
        </div>
      </section>
    </main>
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
    return store.hasCode ? 'Generating project files...' : 'Processing GLTF file...'
  }
  return ''
})

// Methods
async function handleFilesUploaded(result: { 
  buffers: Map<string, ArrayBuffer>
  fileName: string
}) {
  try {
    console.log('Files uploaded result:', result)
    
    // Set the buffers and filename in the store
    store.setBuffers(result.buffers, result.fileName)
    
    // Generate the Vue component code automatically
    await generateCode()
    
  } catch (error) {
    console.error('Error handling uploaded files:', error)
    store.error = `Failed to process files: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function generateCode() {
  try {
    if (!store.fileName) {
      throw new Error('No file selected')
    }
    
    await store.generateVueScene(config.value)
    
  } catch (error) {
    console.error('Error generating code:', error)
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

async function downloadProject() {
  try {
    await store.downloadVueProject(config.value)
  } catch (error) {
    console.error('Failed to download project:', error)
  }
}

// Watch for config changes and regenerate code
watch(config, async () => {
  if (store.fileName && store.buffers) {
    await generateCode()
  }
}, { deep: true })
</script>

<style scoped>
.gltf-converter-app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.app-header {
  text-align: center;
  margin-bottom: 3rem;
  color: white;
}

.app-header h1 {
  font-size: 3rem;
  margin: 0 0 1rem 0;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.app-header p {
  font-size: 1.2rem;
  margin: 0;
  opacity: 0.9;
}

.app-main {
  max-width: 1400px;
  margin: 0 auto;
}

.upload-section {
  margin-bottom: 3rem;
}

.loading-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-top: 2rem;
  color: white;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: #ff6b6b;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-top: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-error {
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

.config-section {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 3rem;
  color: white;
}

.config-section h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.config-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #667eea;
}

.select-label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.select-label select {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
}

.select-label select option {
  background: #333;
  color: white;
}

.results-section {
  margin-top: 3rem;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  min-height: 600px;
}

.viewer-panel,
.code-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 2rem;
  color: white;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.code-header h3 {
  margin: 0;
  font-size: 1.5rem;
}

.code-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5a6fd8;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-secondary.copied {
  background: #28a745;
  border-color: #28a745;
}

.viewer-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
}

@media (max-width: 1024px) {
  .results-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .config-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .app-header h1 {
    font-size: 2rem;
  }
  
  .gltf-converter-app {
    padding: 1rem;
  }
}

@media (max-width: 768px) {
  .code-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .code-actions {
    width: 100%;
    justify-content: stretch;
  }
  
  .code-actions button {
    flex: 1;
  }
}
</style>