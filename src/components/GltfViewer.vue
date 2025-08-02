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
      window-size
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
        :cast-shadow="false"
      />
      
      <!-- Scene Content -->
      <TresGroup>
        <!-- Debug: Default scene for testing -->
        <TresMesh v-if="!gltfScene" :position="[0, 0, 0]">
          <TresBoxGeometry :args="[1, 1, 1]" />
          <TresMeshStandardMaterial color="hotpink" />
        </TresMesh>
        
        <!-- GLTF Model -->
        <primitive 
          v-if="gltfScene"
          :object="gltfScene"
          @click="onModelClick"
        />
      </TresGroup>
      
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls, Environment, ContactShadows } from '@tresjs/cientos'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
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
const gltfScene = ref<THREE.Group | null>(null)
const gltfData = ref<any>(null)
const boundingBox = ref<THREE.Box3 | null>(null)

// Computed
const canvasConfig = computed(() => ({
  clearColor: '#f0f0f0',
  shadows: false, // Disable shadows to prevent proxy errors
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance' as const
}))

const cameraPosition = computed((): [number, number, number] => {
  if (!boundingBox.value || !gltfScene.value) {
    return [3, 3, 3] // Default position when no model
  }
  
  const box = boundingBox.value
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  
  // Ensure minimum distance even for very small models
  const distance = Math.max(maxDim * 2.5, 5)
  
  return [distance, distance * 0.7, distance]
})

// Methods
async function loadGLTF() {
  if (!props.buffers || !props.fileName) {
    gltfScene.value = null
    return
  }

  try {
    loading.value = true
    error.value = null

    // Setup loaders
    const manager = new THREE.LoadingManager()
    const loader = new GLTFLoader(manager)
    
    // Setup DRACO loader
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
    loader.setDRACOLoader(dracoLoader)
    
    // Setup KTX2 loader
    const ktx2Loader = new KTX2Loader()
    ktx2Loader.setTranscoderPath('https://www.gstatic.com/basis/')
    loader.setKTX2Loader(ktx2Loader)
    
    // Setup Meshopt decoder
    loader.setMeshoptDecoder(MeshoptDecoder)

    // Setup URL modifier for loading dependencies
    const objectURLs: string[] = []
    manager.setURLModifier((url: string) => {
      const buffer = props.buffers!.get(url)
      if (buffer) {
        const objectURL = URL.createObjectURL(new Blob([buffer]))
        objectURLs.push(objectURL)
        return objectURL
      }
      return url
    })

    // Get main GLTF buffer
    const gltfBuffer = props.buffers.get(props.fileName)
    if (!gltfBuffer) {
      throw new Error(`GLTF file ${props.fileName} not found in buffers`)
    }

    // Parse GLTF
    const gltf = await new Promise<any>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('GLTF loading timeout after 30 seconds'))
      }, 30000)

      loader.parse(
        gltfBuffer,
        props.fileName.includes('/') ? props.fileName.substring(0, props.fileName.lastIndexOf('/') + 1) : '',
        (result) => {
          clearTimeout(timeoutId)
          resolve(result)
        },
        (error) => {
          clearTimeout(timeoutId)
          reject(error)
        }
      )
    })

    // Clean up object URLs
    objectURLs.forEach(url => URL.revokeObjectURL(url))

    // Process the loaded scene
    gltfData.value = gltf
    
    // Clone the scene to avoid proxy issues
    const clonedScene = gltf.scene.clone()
    gltfScene.value = clonedScene

    // Setup shadows and materials
    setupScene(clonedScene)
    
    // Calculate bounding box for camera positioning
    calculateBoundingBox(clonedScene)

    console.log('GLTF loaded successfully:', gltf)

  } catch (err) {
    console.error('Error loading GLTF:', err)
    error.value = `Failed to load GLTF: ${err instanceof Error ? err.message : 'Unknown error'}`
    gltfScene.value = null
  } finally {
    loading.value = false
  }
}

function setupScene(scene: THREE.Object3D) {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Disable shadows to prevent proxy errors
      child.castShadow = false
      child.receiveShadow = false
      
      // Enhance materials
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => enhanceMaterial(mat))
        } else {
          enhanceMaterial(child.material)
        }
      }
    }
  })
}

function enhanceMaterial(material: THREE.Material) {
  if (material instanceof THREE.MeshStandardMaterial || 
      material instanceof THREE.MeshPhysicalMaterial) {
    material.envMapIntensity = 1
    material.needsUpdate = true
  }
}

function calculateBoundingBox(scene: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(scene)
  boundingBox.value = box
  
  // Get the size of the bounding box
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  
  // Center the scene
  const center = box.getCenter(new THREE.Vector3())
  scene.position.sub(center)
  
  // Scale very small models up
  if (maxDim < 0.5) {
    const scale = 2 / maxDim
    scene.scale.setScalar(scale)
    console.log(`Scaling model by ${scale.toFixed(2)} (original size: ${maxDim.toFixed(4)})`)
  }
  
  // Scale very large models down
  if (maxDim > 20) {
    const scale = 10 / maxDim
    scene.scale.setScalar(scale)
    console.log(`Scaling model by ${scale.toFixed(2)} (original size: ${maxDim.toFixed(2)})`)
  }
}

function onModelClick(event: any) {
  console.log('Model clicked:', event)
}

function onCanvasCreated({ renderer }: { renderer: THREE.WebGLRenderer }) {
  try {
    // Disable shadows completely to prevent proxy errors
    renderer.shadowMap.enabled = false
    renderer.outputColorSpace = THREE.SRGBColorSpace
    
    // Set safer rendering options
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    console.log('Canvas created successfully')
  } catch (error) {
    console.warn('Error setting up renderer:', error)
  }
}

// Cleanup function
function cleanup() {
  if (gltfScene.value) {
    // Cleanup Three.js resources
    gltfScene.value.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose())
        } else {
          child.material?.dispose()
        }
      }
    })
    gltfScene.value = null
  }
}

// Watch for prop changes
watch(() => [props.buffers, props.fileName], () => {
  cleanup() // Clean up previous scene
  loadGLTF()
}, { immediate: true })

watch(() => props.shadows, (newShadows) => {
  if (gltfScene.value) {
    setupScene(gltfScene.value)
  }
})

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