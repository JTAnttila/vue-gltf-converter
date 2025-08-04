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
      v-bind="canvasConfig" 
      class="tres-canvas"
      @created="onCanvasCreated"
      @contextmenu.prevent
    >
      <!-- Camera -->
      <TresPerspectiveCamera 
        :position="cameraPosition" 
        :fov="45" 
      />
      
      <!-- Lighting Setup -->
      <TresAmbientLight :intensity="0.4" />
      <TresDirectionalLight 
        :position="[10, 10, 5]" 
        :intensity="props.intensity * 0.8"
        :cast-shadow="props.shadows"
      />
      
      <!-- Environment -->
      <Environment 
        v-if="props.environment !== 'none'"
        :preset="props.environment"
      />
      
      <!-- Contact Shadows -->
      <ContactShadows 
        v-if="props.contactShadow"
        :opacity="0.4"
        :scale="10"
        :blur="1"
        :far="10"
        :resolution="256"
      />
      
      <!-- Scene Content with Suspense -->
      <Suspense>
        <template #default>
          <GltfModel 
            v-if="modelUrl"
            :path="modelUrl"
            @click="onModelClick"
          />
        </template>
        <template #fallback>
          <!-- Fallback content while loading -->
          <TresMesh :position="[0, 0, 0]">
            <TresBoxGeometry :args="[1, 1, 1]" />
            <TresMeshStandardMaterial color="hotpink" />
          </TresMesh>
        </template>
      </Suspense>
      
      <!-- Controls -->
      <OrbitControls 
        :auto-rotate="props.autoRotate"
        :auto-rotate-speed="2"
        :enable-damping="true"
        :damping-factor="0.05"
        :max-polar-angle="Math.PI"
        :min-distance="0.5"
        :max-distance="50"
        :enable-zoom="true"
        :enable-pan="true"
      />
    </TresCanvas>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, defineComponent, h } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@tresjs/cientos'
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

// Computed
const canvasConfig = computed(() => ({
  clearColor: '#f0f0f0',
  shadows: props.shadows,
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance' as const,
  windowSize: true
}))

const cameraPosition = computed((): [number, number, number] => {
  return [3, 3, 3]
})

// Custom GLTF Model component
const GltfModel = defineComponent({
  props: {
    path: {
      type: String,
      required: true
    }
  },
  async setup(props) {
    try {
      const { scene } = await useGLTF(props.path)
      
      if (scene) {
        // Auto-scale and center the model
        const box = new THREE.Box3().setFromObject(scene)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        
        // Center the model
        scene.position.sub(center)
        
        // Scale the model to fit in view
        const maxDim = Math.max(size.x, size.y, size.z)
        if (maxDim > 0) {
          const scale = Math.min(3 / maxDim, 5) // Max scale of 5
          scene.scale.setScalar(scale)
        }
        
        console.log('GLTF model loaded and scaled:', { size, scale: scene.scale.x })
      }
      
      return () => h('primitive', { object: scene })
    } catch (error) {
      console.error('Error loading GLTF model:', error)
      throw error
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

    console.log('Model URL created:', url)

  } catch (err) {
    console.error('Error creating model URL:', err)
    error.value = `Failed to create model URL: ${err instanceof Error ? err.message : 'Unknown error'}`
    modelUrl.value = null
  } finally {
    loading.value = false
  }
}

function onModelClick(event: any) {
  console.log('Model clicked:', event)
}

function onCanvasCreated({ renderer }: any) {
  try {
    renderer.shadowMap.enabled = props.shadows
    if (renderer.shadowMap) {
      renderer.shadowMap.type = 2 // PCFSoftShadowMap constant value
    }
    if (renderer.outputColorSpace !== undefined) {
      renderer.outputColorSpace = 'srgb'
    } else if (renderer.outputEncoding !== undefined) {
      renderer.outputEncoding = 3001 // sRGBEncoding constant value
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    console.log('Canvas created successfully')
  } catch (error) {
    console.warn('Error setting up renderer:', error)
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
</style>