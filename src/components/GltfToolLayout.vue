<template>
  <div class="gltf-tool">
    <!-- Header -->
    <header class="tool-header">
      <div class="header-content">
        <h1>Vue GLTF to TresJS</h1>
        <p>Convert GLTF models into Vue 3 / Nuxt TresJS components</p>
      </div>
    </header>

    <!-- File Upload Overlay (when no file is loaded) -->
    <div v-if="!store.fileName" class="upload-overlay">
      <div class="upload-container">
        <FileUploader @filesUploaded="handleFilesUploaded" />
      </div>
    </div>

    <!-- Main Tool Interface (when file is loaded) -->
    <div v-else class="tool-content">
      <!-- Left Panel: Generated Code -->
      <div class="code-panel">
        <div class="panel-header">
          <h3>Generated Component</h3>
          <div class="header-actions">
            <button @click="copyCode" class="btn btn-sm">
              {{ codeCopied ? 'Copied!' : 'Copy' }}
            </button>
            <button @click="store.reset()" class="btn btn-sm btn-secondary">
              New File
            </button>
          </div>
        </div>
        <div class="code-content">
          <div v-if="store.code" class="code-display">
            <pre><code>{{ store.code }}</code></pre>
          </div>
          <div v-else class="code-loading">
            <div class="spinner"></div>
            <p>Generating component...</p>
          </div>
        </div>
      </div>

      <!-- Center Panel: 3D Viewer -->
      <div class="viewer-panel">
        <GltfViewer 
          :buffers="store.buffers"
          :fileName="store.fileName"
          :shadows="config.shadows"
          :contact-shadow="config.contactShadow"
          :auto-rotate="config.autoRotate"
          :environment="config.environment"
          :intensity="config.intensity"
        />
      </div>

      <!-- Right Panel: Configuration -->
      <div class="config-panel">
        <div class="panel-header">
          <h3>Configuration</h3>
        </div>
        
        <div class="config-content">
          <!-- Generation Options -->
          <div class="config-section">
            <div class="config-item">
              <label class="checkbox-label">
                <input v-model="config.types" type="checkbox">
                types
              </label>
            </div>
            
            <div class="config-item">
              <label class="checkbox-label">
                <input v-model="config.shadows" type="checkbox">
                shadows
              </label>
            </div>
            
            <div class="config-item">
              <label class="checkbox-label">
                <input v-model="config.instanceall" type="checkbox">
                instance
              </label>
            </div>
            
            <div class="config-item">
              <label class="checkbox-label">
                <input v-model="config.instanceall" type="checkbox">
                instance all
              </label>
            </div>
            
            <div class="config-item">
              <label class="checkbox-label">
                <input v-model="config.verbose" type="checkbox">
                verbose
              </label>
            </div>
            
            <div class="config-item">
              <label class="checkbox-label">
                <input v-model="config.keepNames" type="checkbox">
                keep names
              </label>
            </div>
            
            <div class="config-item">
              <label class="checkbox-label">
                <input v-model="config.keepGroups" type="checkbox">
                keep groups
              </label>
            </div>
            
            <div class="config-item">
              <label class="checkbox-label">
                <input v-model="config.meta" type="checkbox">
                meta
              </label>
            </div>
          </div>

          <!-- Precision Slider -->
          <div class="config-section">
            <div class="config-item">
              <label class="slider-label">
                precision
                <input 
                  v-model.number="config.precision" 
                  type="range" 
                  min="1" 
                  max="10" 
                  step="1"
                  class="slider"
                >
                <span class="value">{{ config.precision }}</span>
              </label>
            </div>
          </div>

          <!-- Path Prefix -->
          <div class="config-section">
            <div class="config-item">
              <label class="input-label">
                path prefix
                <input 
                  v-model="config.pathPrefix" 
                  type="text" 
                  class="text-input"
                  placeholder="./assets/"
                >
              </label>
            </div>
          </div>

          <!-- Preview Section -->
          <div class="config-section">
            <h4>preview</h4>
            
            <div class="config-item">
              <label class="checkbox-label">
                <input v-model="config.autoRotate" type="checkbox">
                autorotate
              </label>
            </div>
            
            <div class="config-item">
              <label class="checkbox-label">
                <input v-model="config.contactShadow" type="checkbox">
                contactSha...
              </label>
            </div>
            
            <div class="config-item">
              <label class="slider-label">
                light inte...
                <input 
                  v-model.number="config.intensity" 
                  type="range" 
                  min="0" 
                  max="3" 
                  step="0.1"
                  class="slider"
                >
                <span class="value">{{ config.intensity.toFixed(1) }}</span>
              </label>
            </div>
            
            <div class="config-item">
              <label class="select-label">
                preset
                <select v-model="config.preset" class="select-input">
                  <option value="rembrandt">rembrandt</option>
                  <option value="portrait">portrait</option>
                  <option value="upfront">upfront</option>
                  <option value="soft">soft</option>
                </select>
              </label>
            </div>
            
            <div class="config-item">
              <label class="select-label">
                environment
                <select v-model="config.environment" class="select-input">
                  <option value="city">city</option>
                  <option value="sunset">sunset</option>
                  <option value="dawn">dawn</option>
                  <option value="night">night</option>
                  <option value="warehouse">warehouse</option>
                  <option value="forest">forest</option>
                  <option value="apartment">apartment</option>
                  <option value="studio">studio</option>
                  <option value="park">park</option>
                  <option value="lobby">lobby</option>
                </select>
              </label>
            </div>
          </div>

          <!-- Framework Selection -->
          <div class="config-section">
            <h4>framework</h4>
            <div class="radio-group">
              <label class="radio-label">
                <input v-model="config.framework" value="vue3" type="radio">
                Vue 3
              </label>
              <label class="radio-label">
                <input v-model="config.framework" value="nuxt" type="radio">
                Nuxt 3
              </label>
            </div>
          </div>

          <!-- Export Section -->
          <div class="config-section export-section">
            <h4>exports</h4>
            
            <button @click="copyCode" class="export-btn" :class="{ active: codeCopied }">
              {{ codeCopied ? 'copied!' : 'copy to clipboard' }}
            </button>
            
            <button @click="downloadProject" class="export-btn" :disabled="!store.code">
              download zip
            </button>
            
            <button @click="downloadImage" class="export-btn">
              download image
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="store.isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner large"></div>
        <p>{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- Error Toast -->
    <div v-if="store.error" class="error-toast">
      <p>{{ store.error }}</p>
      <button @click="store.clearError()" class="close-btn">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGltfStore } from '../stores/useGltfStore'
import GltfViewer from './GltfViewer.vue'
import FileUploader from './FileUploader.vue'

// Store
const store = useGltfStore()

// State
const codeCopied = ref(false)

// Configuration matching gltf-react-three options
const config = ref({
  types: true,
  shadows: true,
  instanceall: false,
  verbose: false,
  keepNames: false,
  keepGroups: false,
  meta: false,
  precision: 3,
  pathPrefix: '',
  autoRotate: false,
  contactShadow: true,
  intensity: 1.0,
  preset: 'rembrandt',
  environment: 'city',
  framework: 'vue3' as 'vue3' | 'nuxt'
})

// Computed
const loadingMessage = computed(() => {
  if (store.isLoading) {
    return store.code ? 'Generating project files...' : 'Processing GLTF file...'
  }
  return ''
})

// Methods
async function handleFilesUploaded(result: { 
  buffers: Map<string, ArrayBuffer>
  fileName: string
}) {
  try {
    console.log('Files uploaded:', result)
    
    store.setBuffers(result.buffers, result.fileName)
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

async function downloadImage() {
  // TODO: Implement screenshot functionality
  console.log('Download image not implemented yet')
}

// Watch for config changes and regenerate code
watch(config, async () => {
  if (store.fileName && store.buffers) {
    await generateCode()
  }
}, { deep: true })
</script>

<style scoped>
.gltf-tool {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
  font-size: 14px;
  background: #fff;
  color: #333;
}

.tool-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  padding: 1rem 2rem;
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.header-content p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.upload-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.upload-container {
  max-width: 500px;
  width: 100%;
  padding: 2rem;
}

.tool-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr 300px;
  min-height: 0;
}

/* Code Panel */
.code-panel {
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.panel-header {
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  background: white;
}

.panel-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.code-content {
  flex: 1;
  overflow: hidden;
}

.code-display {
  height: 100%;
  overflow: auto;
}

.code-display pre {
  margin: 0;
  padding: 1.5rem;
  font-size: 12px;
  line-height: 1.4;
  background: #f8f9fa;
  color: #333;
  height: 100%;
  overflow: auto;
}

.code-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

/* Viewer Panel */
.viewer-panel {
  border-right: 1px solid #e9ecef;
  background: white;
}

/* Config Panel */
.config-panel {
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.config-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.config-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.config-section:last-child {
  border-bottom: none;
}

.config-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.config-item {
  margin-bottom: 0.75rem;
}

.config-item:last-child {
  margin-bottom: 0;
}

/* Form Controls */
.checkbox-label {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  cursor: pointer;
  color: #555;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 0.5rem;
  width: 14px;
  height: 14px;
}

.slider-label {
  display: block;
  font-size: 0.85rem;
  color: #555;
}

.slider {
  width: 100%;
  margin: 0.5rem 0;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  outline: none;
}

.value {
  float: right;
  font-weight: 600;
  color: #333;
}

.input-label,
.select-label {
  display: block;
  font-size: 0.85rem;
  color: #555;
  margin-bottom: 0.25rem;
}

.text-input,
.select-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.8rem;
  background: white;
  margin-top: 0.25rem;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.radio-label {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  cursor: pointer;
  color: #555;
}

.radio-label input[type="radio"] {
  margin-right: 0.5rem;
}

/* Export Section */
.export-section {
  border-top: 2px solid #e9ecef;
  padding-top: 1rem;
}

.export-btn {
  display: block;
  width: 100%;
  padding: 0.6rem;
  margin-bottom: 0.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.export-btn:hover:not(:disabled) {
  background: #0056b3;
}

.export-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.export-btn.active {
  background: #28a745;
}

/* Buttons */
.btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid #007bff;
  background: #007bff;
  color: white;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
}

.btn-secondary {
  background: #6c757d;
  border-color: #6c757d;
}

.btn-secondary:hover {
  background: #545b62;
  border-color: #545b62;
}

/* Loading and Error */
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
}

.loading-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

.spinner.large {
  width: 40px;
  height: 40px;
  border-width: 4px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
  max-width: 400px;
  z-index: 1001;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #721c24;
  margin-left: 1rem;
}
</style>