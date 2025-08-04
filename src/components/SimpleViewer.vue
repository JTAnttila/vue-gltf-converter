<template>
  <div class="viewer-container">
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading 3D model...</p>
    </div>
    
    <div v-if="error" class="error-overlay">
      <p>{{ error }}</p>
    </div>
    
    <TresCanvas 
      v-if="!loading && !error && modelUrl"
      clear-color="#f8f8f8"
      :shadows="true"
      :alpha="true"
      :antialias="true"
      window-size
      class="tres-canvas"
    >
      <!-- Camera -->
      <TresPerspectiveCamera 
        ref="camera"
        :position="[2, 1, 2]" 
        :fov="50" 
        :near="0.1"
        :far="100"
        :look-at="[0, 0, 0]"
      />
      
      <!-- Lighting -->
      <TresAmbientLight :intensity="0.6" />
      <TresDirectionalLight 
        :position="[5, 5, 5]" 
        :intensity="0.8"
        :cast-shadow="true"
      />
      
      <!-- Scene Content -->
      <Suspense>
        <template #default>
          <GltfModelDisplay 
            v-if="modelUrl && props.buffers"
            :model-url="modelUrl"
            :buffers="props.buffers"
          />
        </template>
        <template #fallback>
          <!-- Loading fallback -->
          <TresMesh>
            <TresBoxGeometry :args="[1, 1, 1]" />
            <TresMeshStandardMaterial color="orange" />
          </TresMesh>
        </template>
      </Suspense>
      
      <!-- Controls -->
      <OrbitControls 
        ref="controls"
        :enableDamping="true"
        :dampingFactor="0.05"
        :enableZoom="true"
        :enablePan="true"
        :enableRotate="true"
        :autoRotate="false"
        :target="[0, 0, 0]"
        :minDistance="0.5"
        :maxDistance="20"
      />
    </TresCanvas>
    
    <div v-if="!loading && !error && !modelUrl" class="no-model">
      <p>No model to display</p>
    </div>
    
    <!-- Editorial Controls Panel -->
    <div v-if="!loading && !error && modelUrl" class="editor-panel">
      <div class="editor-header">
        <h4>Scene Controls</h4>
      </div>
      
      <div class="editor-controls">
        <!-- Camera Controls -->
        <div class="control-group">
          <label class="control-label">Camera</label>
          <button @click="resetCamera" class="action-btn">
            Reset View
          </button>
        </div>
        
        <!-- Model Info -->
        <div class="control-group">
          <label class="control-label">Model Info</label>
          <div class="selection-info">
            File: {{ props.fileName || 'Unknown' }}
          </div>
        </div>
        
        <!-- Controls Info -->
        <div class="control-group">
          <label class="control-label">Controls</label>
          <div class="controls-help">
            <p>• Mouse: Rotate view</p>
            <p>• Wheel: Zoom in/out</p>
            <p>• Right-click + drag: Pan</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, defineComponent, h } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import * as THREE from 'three'

interface Props {
  buffers?: Map<string, ArrayBuffer> | null
  fileName?: string
  shadows?: boolean
  contactShadow?: boolean
  autoRotate?: boolean
  environment?: string
  preset?: string
  intensity?: number
}

const props = withDefaults(defineProps<Props>(), {
  buffers: null,
  fileName: '',
  shadows: true,
  contactShadow: true,
  autoRotate: false,
  environment: 'city',
  preset: 'rembrandt',
  intensity: 1
})

// State
const loading = ref(false)
const error = ref<string | null>(null)
const modelUrl = ref<string | null>(null)

// Editorial tools state  
const camera = ref<any>(null)
const controls = ref<any>(null)

// Editorial tool methods
function resetCamera() {
  if (camera.value && controls.value) {
    // Reset camera position and controls
    camera.value.position.set(2, 1, 2)
    camera.value.lookAt(0, 0, 0)
    controls.value.target.set(0, 0, 0)
    controls.value.update()
  }
}

// GLTF Model Display Component
const GltfModelDisplay = defineComponent({
  props: {
    modelUrl: {
      type: String,
      required: true
    },
    buffers: {
      type: Object as () => Map<string, ArrayBuffer>,
      required: true
    }
  },
  async setup(props) {
    try {
      console.log('Loading GLTF from:', props.modelUrl)
      console.log('Available buffers:', Array.from(props.buffers.keys()))
      
      // Create loading manager to handle dependencies
      const loadingManager = new THREE.LoadingManager()
      const objectURLs: string[] = []
      
      // Set URL modifier to serve dependencies from buffers
      loadingManager.setURLModifier((url: string) => {
        console.log('LoadingManager intercepted URL:', url)
        
        // Extract filename from URL
        const urlParts = url.split('/')
        const fileName = urlParts[urlParts.length - 1] as string
        
        // Check if we have this file in our buffers
        if (props.buffers.has(fileName)) {
          console.log('Creating blob URL for dependency:', fileName)
          const buffer = props.buffers.get(fileName)!
          const blob = new Blob([buffer], { type: 'application/octet-stream' })
          const objectURL = URL.createObjectURL(blob)
          objectURLs.push(objectURL)
          return objectURL
        }
        
        // If no match found, return original URL
        console.log('No buffer found for:', fileName)
        return url
      })
      
      // Create GLTF loader with managers
      const loader = new GLTFLoader(loadingManager)
      
      // Setup DRACO loader for compressed models
      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
      loader.setDRACOLoader(dracoLoader)
      
      // Load the GLTF model
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          props.modelUrl,
          (result) => {
            console.log('GLTF loaded successfully')
            resolve(result)
          },
          (progress) => {
            console.log('Loading progress:', progress)
          },
          (error) => {
            console.error('GLTF loading error:', error)
            reject(error)
          }
        )
      })
      
      // Clean up object URLs
      objectURLs.forEach(url => URL.revokeObjectURL(url))
      
      const scene = gltf.scene
      
      if (scene) {
        // Auto-scale and center the model
        const box = new THREE.Box3().setFromObject(scene)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        
        // Center the model at origin
        scene.position.sub(center)
        
        // Scale the model to fit nicely in view (target size around 2 units)
        const maxDim = Math.max(size.x, size.y, size.z)
        if (maxDim > 0) {
          const targetSize = 2 // Target size in world units
          const scale = targetSize / maxDim
          scene.scale.setScalar(scale)
        }
        
        // Enable shadows on all meshes
        scene.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        
        console.log('GLTF model processed:', { 
          originalSize: size.toArray(), 
          scale: scene.scale.x,
          center: center.toArray(),
          animations: gltf.animations?.length || 0
        })
      }
      
      return () => h('primitive', { object: scene })
    } catch (error) {
      console.error('Error loading GLTF model:', error)
      // Return a fallback mesh on error
      return () => h('TresMesh', {}, [
        h('TresBoxGeometry', { args: [1, 1, 1] }),
        h('TresMeshStandardMaterial', { color: 'red' })
      ])
    }
  }
})

// Methods
async function createModelUrl() {
  if (!props.buffers || !props.fileName) {
    modelUrl.value = null
    return
  }

  try {
    loading.value = true
    error.value = null

    console.log('Creating model URL for:', props.fileName)
    console.log('Available buffers:', Array.from(props.buffers.keys()))

    // Get the main GLTF buffer
    const gltfBuffer = props.buffers.get(props.fileName)
    if (!gltfBuffer) {
      throw new Error(`GLTF file ${props.fileName} not found in buffers`)
    }

    // Create blob URL for the main GLTF file
    const blob = new Blob([gltfBuffer], { 
      type: props.fileName.endsWith('.glb') ? 'model/gltf-binary' : 'model/gltf+json' 
    })
    const url = URL.createObjectURL(blob)
    modelUrl.value = url

    console.log('Model URL created successfully:', url)

  } catch (err) {
    console.error('Error creating model URL:', err)
    error.value = `Failed to create model URL: ${err instanceof Error ? err.message : 'Unknown error'}`
    modelUrl.value = null
  } finally {
    loading.value = false
  }
}

// Cleanup function
function cleanup() {
  if (modelUrl.value) {
    URL.revokeObjectURL(modelUrl.value)
    modelUrl.value = null
  }
}

// Watch for prop changes
watch(() => [props.buffers, props.fileName], () => {
  cleanup()
  createModelUrl()
}, { immediate: true })

// Cleanup on unmount
onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.viewer-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  isolation: isolate;
}

.tres-canvas {
  width: 100% !important;
  height: 100% !important;
  position: relative !important;
  pointer-events: auto;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 100;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-overlay p,
.error-overlay p {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.error-overlay {
  background: rgba(255, 245, 245, 0.95);
}

.error-overlay p {
  color: #d32f2f;
  text-align: center;
  padding: 0 2rem;
}

/* Editor Panel */
.editor-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 280px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 100;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.editor-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px 8px 0 0;
}

.editor-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.editor-controls {
  padding: 20px;
  max-height: 400px;
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

.button-group {
  display: flex;
  gap: 4px;
}

.mode-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  color: #555;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.mode-btn.active {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.selection-info {
  padding: 8px 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-family: monospace;
}

.controls-help {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 8px 12px;
}

.controls-help p {
  margin: 0 0 4px 0;
  font-size: 11px;
  color: #666;
  line-height: 1.4;
}

.controls-help p:last-child {
  margin-bottom: 0;
}

.clear-btn,
.action-btn {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #6c757d;
  background: #6c757d;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover,
.action-btn:hover {
  background: #5a6268;
  border-color: #5a6268;
}

.clear-btn:disabled {
  background: #e9ecef;
  border-color: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}

.no-model {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  text-align: center;
}
</style>
