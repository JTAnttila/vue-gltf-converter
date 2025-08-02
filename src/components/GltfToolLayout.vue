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

    <!-- Main Tool Interface with Resizable Panels -->
    <div v-else class="tool-content">
      <div class="resizable-layout">
        <!-- Left Panel: Generated Code -->
        <div class="code-panel" :style="{ width: leftPanelWidth + 'px' }">
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
              <p v-if="store.error" style="color: red;">Error: {{ store.error }}</p>
            </div>
          </div>
        </div>

        <!-- Left Resizer -->
        <div 
          class="resizer left-resizer"
          @mousedown="startResize('left', $event)"
        ></div>

        <!-- Center Panel: 3D Viewer with Overlay Controls -->
        <div class="viewer-panel" :style="{ width: centerPanelWidth + 'px' }">
          <div class="viewer-container">
            <GltfViewer 
              :buffers="store.buffers"
              :fileName="store.fileName"
              :shadows="config.shadows"
              :contact-shadow="config.contactShadow"
              :auto-rotate="config.autoRotate"
              :environment="config.environment"
              :intensity="config.intensity"
            />
            
            <!-- Overlay Controls (like original gltf-react-three) -->
            <div class="canvas-controls">
              <div class="controls-panel">
                <div class="controls-header">
                  <h4>Scene Controls</h4>
                  <button 
                    class="toggle-controls" 
                    @click="controlsVisible = !controlsVisible"
                  >
                    {{ controlsVisible ? '−' : '+' }}
                  </button>
                </div>
                
                <div v-if="controlsVisible" class="controls-content">
                  <!-- Generation Options -->
                  <div class="control-group">
                    <label class="control-label">Generation</label>
                    <div class="control-items">
                      <label class="checkbox-item">
                        <input v-model="config.types" type="checkbox">
                        <span>Types</span>
                      </label>
                      <label class="checkbox-item">
                        <input v-model="config.shadows" type="checkbox">
                        <span>Shadows</span>
                      </label>
                      <label class="checkbox-item">
                        <input v-model="config.instanceall" type="checkbox">
                        <span>Instance All</span>
                      </label>
                      <label class="checkbox-item">
                        <input v-model="config.verbose" type="checkbox">
                        <span>Verbose</span>
                      </label>
                    </div>
                  </div>

                  <!-- Scene Options -->
                  <div class="control-group">
                    <label class="control-label">Scene</label>
                    <div class="control-items">
                      <label class="checkbox-item">
                        <input v-model="config.contactShadow" type="checkbox">
                        <span>Contact Shadows</span>
                      </label>
                      <label class="checkbox-item">
                        <input v-model="config.autoRotate" type="checkbox">
                        <span>Auto Rotate</span>
                      </label>
                    </div>
                  </div>

                  <!-- Environment -->
                  <div class="control-group">
                    <label class="control-label">Environment</label>
                    <select v-model="config.environment" class="control-select">
                      <option value="none">None</option>
                      <option value="city">City</option>
                      <option value="sunset">Sunset</option>
                      <option value="forest">Forest</option>
                      <option value="studio">Studio</option>
                    </select>
                  </div>

                  <!-- Lighting Intensity -->
                  <div class="control-group">
                    <label class="control-label">
                      Light Intensity: {{ config.intensity }}
                    </label>
                    <input 
                      v-model.number="config.intensity"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      class="control-range"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Resizer -->
        <div 
          class="resizer right-resizer"
          @mousedown="startResize('right', $event)"
        ></div>

        <!-- Right Panel: Additional Tools (Optional) -->
        <div class="tools-panel" :style="{ width: rightPanelWidth + 'px' }">
          <div class="panel-header">
            <h3>Tools</h3>
          </div>
          <div class="tools-content">
            <button @click="downloadProject" class="action-btn primary">
              Download Project
            </button>
            <button @click="downloadImage" class="action-btn secondary">
              Download Image
            </button>
            <button @click="resetLayout" class="action-btn">
              Reset Layout
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useGltfStore } from '@/stores/useGltfStore'
import GltfViewer from '@/components/GltfViewer.vue'
import TestViewer from '@/components/TestViewer.vue'
import FileUploader from '@/components/FileUploader.vue'

const store = useGltfStore()

// Panel sizing
const leftPanelWidth = ref(350)  // Smaller default size for code panel
const rightPanelWidth = ref(200) // Smaller tools panel
const containerWidth = ref(0) // Will be set on mount

// Control visibility
const controlsVisible = ref(true)

// Configuration
const config = ref({
  types: false,
  shadows: true,
  instanceall: false,
  verbose: false,
  contactShadow: true,
  autoRotate: false,
  environment: 'city',
  intensity: 1
})

// Computed
const centerPanelWidth = computed(() => {
  const totalPanelWidth = leftPanelWidth.value + rightPanelWidth.value + 16 // Account for resizers
  return Math.max(400, containerWidth.value - totalPanelWidth)
})

// Copy state
const codeCopied = ref(false)

// Resizing state
const isResizing = ref(false)
const resizeType = ref<'left' | 'right' | null>(null)
const startX = ref(0)
const startWidth = ref(0)

// Methods
function startResize(type: 'left' | 'right', event: MouseEvent) {
  event.preventDefault()
  isResizing.value = true
  resizeType.value = type
  startX.value = event.clientX
  
  if (type === 'left') {
    startWidth.value = leftPanelWidth.value
  } else {
    startWidth.value = rightPanelWidth.value
  }
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResize(event: MouseEvent) {
  if (!isResizing.value || !resizeType.value) return
  
  event.preventDefault()
  const deltaX = event.clientX - startX.value
  
  if (resizeType.value === 'left') {
    const newWidth = Math.max(200, Math.min(600, startWidth.value + deltaX))
    leftPanelWidth.value = newWidth
  } else {
    const newWidth = Math.max(150, Math.min(400, startWidth.value - deltaX))
    rightPanelWidth.value = newWidth
  }
}

function stopResize() {
  isResizing.value = false
  resizeType.value = null
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function resetLayout() {
  leftPanelWidth.value = 350
  rightPanelWidth.value = 200
}

async function handleFilesUploaded(result: { 
  buffers: Map<string, ArrayBuffer>
  fileName: string
}) {
  try {
    store.setBuffers(result.buffers, result.fileName)
    await generateCode()
  } catch (error) {
    console.error('Error handling uploaded files:', error)
  }
}

async function generateCode() {
  try {
    console.log('generateCode called', {
      fileName: store.fileName,
      buffers: store.buffers?.size,
      config: config.value
    })
    
    if (!store.fileName) {
      console.log('No filename, skipping code generation')
      return
    }
    
    console.log('Calling store.generateVueScene...')
    await store.generateVueScene(config.value)
    console.log('Code generation completed:', !!store.code)
    
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

function downloadImage() {
  // TODO: Implement canvas screenshot
  console.log('Download image functionality coming soon')
}

// Handle window resize
function updateContainerWidth() {
  containerWidth.value = window.innerWidth
  
  // Ensure panels don't exceed window width
  const maxLeft = Math.min(leftPanelWidth.value, window.innerWidth * 0.4)
  const maxRight = Math.min(rightPanelWidth.value, window.innerWidth * 0.3)
  
  if (leftPanelWidth.value !== maxLeft) leftPanelWidth.value = maxLeft
  if (rightPanelWidth.value !== maxRight) rightPanelWidth.value = maxRight
}

onMounted(() => {
  updateContainerWidth()
  window.addEventListener('resize', updateContainerWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerWidth)
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})

// Watch config changes
watch(config, async () => {
  if (store.fileName && store.buffers) {
    await generateCode()
  }
}, { deep: true })
</script>

<style scoped>
.gltf-tool {
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  background: #f8f9fa;
  overflow: hidden; /* Prevent whole page scrolling */
}

.tool-header {
  flex-shrink: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
}

.header-content h1 {
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.header-content p {
  margin: 0;
  opacity: 0.9;
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
  overflow: hidden;
}

.resizable-layout {
  display: flex;
  height: 100%;
  position: relative;
  width: 100%;
}

/* Code Panel */
.code-panel {
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  min-width: 200px;
  max-width: 600px;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  background: white;
  flex-shrink: 0;
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

.btn {
  padding: 0.375rem 0.75rem;
  border: 1px solid #007bff;
  background: #007bff;
  color: white;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  border-color: #6c757d;
}

.code-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.code-display {
  flex: 1;
  overflow: auto; /* Only code area scrolls */
  background: #f8f9fa;
}

.code-display pre {
  margin: 0;
  padding: 1.5rem;
  font-size: 12px;
  line-height: 1.4;
  background: transparent;
  color: #333;
  min-height: 100%;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.code-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

/* Viewer Panel */
.viewer-panel {
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #e9ecef;
  flex: 1;
  min-width: 400px;
  flex-shrink: 0;
}

.viewer-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  isolation: isolate;
}

/* Canvas Overlay Controls */
.canvas-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
  max-width: 280px;
}

.controls-panel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.controls-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.toggle-controls {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.toggle-controls:hover {
  background: rgba(0, 0, 0, 0.1);
}

.controls-content {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

.control-group {
  margin-bottom: 20px;
}

.control-group:last-child {
  margin-bottom: 0;
}

.control-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.control-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 13px;
  color: #555;
}

.checkbox-item input[type="checkbox"] {
  margin-right: 8px;
  width: 14px;
  height: 14px;
}

.control-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background: white;
}

.control-range {
  width: 100%;
  margin-top: 8px;
}

/* Tools Panel */
.tools-panel {
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  min-width: 150px;
  max-width: 400px;
  flex-shrink: 0;
}

.tools-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: white;
  color: #555;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.action-btn:hover {
  background: #f8f9fa;
}

.action-btn.primary {
  background: #28a745;
  border-color: #28a745;
  color: white;
}

.action-btn.primary:hover {
  background: #218838;
}

.action-btn.secondary {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.action-btn.secondary:hover {
  background: #0056b3;
}

/* Resizers */
.resizer {
  width: 8px;
  background: #dee2e6;
  cursor: col-resize;
  transition: background-color 0.2s;
  position: relative;
  flex-shrink: 0;
  border-left: 1px solid #e9ecef;
  border-right: 1px solid #e9ecef;
  z-index: 10;
}

.resizer:hover {
  background: #667eea;
}

.resizer:active {
  background: #5a6fd8;
}

.resizer::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 24px;
  background: #adb5bd;
  border-radius: 1px;
}

.resizer:hover::after {
  background: white;
}

/* Spinner */
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 1024px) {
  .resizable-layout {
    flex-direction: column;
  }
  
  .code-panel,
  .viewer-panel,
  .tools-panel {
    width: 100% !important;
  }
  
  .resizer {
    display: none;
  }
  
  .canvas-controls {
    position: relative;
    top: auto;
    right: auto;
    margin: 16px;
    max-width: none;
  }
}

@media (max-width: 768px) {
  .tool-header {
    padding: 1rem;
  }
  
  .header-content h1 {
    font-size: 1.25rem;
  }
  
  .canvas-controls {
    margin: 8px;
  }
  
  .controls-panel {
    font-size: 12px;
  }
}
</style>