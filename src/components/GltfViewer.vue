<template>
  <div class="viewer-container">
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-else-if="!scene" class="loading-message">
      Loading 3D model...
    </div>
    
    <TresCanvas 
      v-else
      v-bind="canvasConfig" 
      window-size
      class="tres-canvas"
    >
      <!-- Camera -->
      <TresPerspectiveCamera 
        :position="[0, 0, 150]" 
        :fov="50" 
      />
      
      <!-- Lighting -->
      <TresAmbientLight :intensity="ambientIntensity" />
      <TresDirectionalLight 
        v-if="!useEnvironmentLighting"
        :position="[10, 10, 5]" 
        :intensity="directionalIntensity"
        :cast-shadow="shadows"
      />
      
      <!-- Environment -->
      <Suspense>
        <Environment 
          v-if="useEnvironmentLighting"
          :preset="preset"
          :background="true"
        />
      </Suspense>
      
      <!-- Stage/Scene -->
      <Suspense>
        <TresGroup>
          <!-- Contact Shadow -->
          <ContactShadows 
            v-if="contactShadow"
            :opacity="0.4"
            :scale="20"
            :blur="1"
            :far="10"
            :resolution="256"
          />
          
          <!-- Main 3D Model -->
          <primitive 
            :object="scene"
            :cast-shadow="shadows"
            :receive-shadow="shadows"
          />
        </TresGroup>
      </Suspense>
      
      <!-- Controls -->
      <OrbitControls 
        :auto-rotate="autoRotate"
        :enable-damping="true"
        :damping-factor="0.05"
        :max-polar-angle="Math.PI / 2"
      />
    </TresCanvas>
    
    <!-- Controls Panel -->
    <div v-if="showControls" class="controls-panel">
      <div class="control-group">
        <label>
          <input 
            v-model="shadows" 
            type="checkbox"
          />
          Shadows
        </label>
        
        <label>
          <input 
            v-model="contactShadow" 
            type="checkbox"
          />
          Contact Shadow
        </label>
        
        <label>
          <input 
            v-model="autoRotate" 
            type="checkbox"
          />
          Auto Rotate
        </label>
        
        <label>
          <input 
            v-model="useEnvironmentLighting" 
            type="checkbox"
          />
          Environment Lighting
        </label>
      </div>
      
      <div class="control-group">
        <label>
          Environment:
          <select v-model="environment">
            <option value="sunset">Sunset</option>
            <option value="dawn">Dawn</option>
            <option value="night">Night</option>
            <option value="warehouse">Warehouse</option>
            <option value="forest">Forest</option>
            <option value="apartment">Apartment</option>
            <option value="studio">Studio</option>
            <option value="city">City</option>
            <option value="park">Park</option>
            <option value="lobby">Lobby</option>
          </select>
        </label>
        
        <label>
          Preset:
          <select v-model="preset">
            <option value="rembrandt">Rembrandt</option>
            <option value="portrait">Portrait</option>
            <option value="upfront">Upfront</option>
            <option value="soft">Soft</option>
          </select>
        </label>
      </div>
      
      <div class="control-group">
        <label>
          Intensity:
          <input 
            v-model.number="intensity" 
            type="range" 
            min="0" 
            max="2" 
            step="0.1"
          />
          <span>{{ intensity }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { TresCanvas, useRenderLoop } from '@tresjs/core'
import { OrbitControls, Environment, ContactShadows } from '@tresjs/cientos'
import * as THREE from 'three'

interface Props {
  scene?: THREE.Scene | null
  shadows?: boolean
  contactShadow?: boolean
  autoRotate?: boolean
  environment?: string
  preset?: string
  intensity?: number
  showControls?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  scene: null,
  shadows: true,
  contactShadow: true,
  autoRotate: false,
  environment: 'city',
  preset: 'rembrandt',
  intensity: 1,
  showControls: false
})

// Reactive state
const shadows = ref(props.shadows)
const contactShadow = ref(props.contactShadow)
const autoRotate = ref(props.autoRotate)
const environment = ref(props.environment)
const preset = ref(props.preset)
const intensity = ref(props.intensity)
const useEnvironmentLighting = ref(true)
const error = ref<string | null>(null)

// Computed properties
const canvasConfig = computed(() => ({
  clearColor: '#1a1a1a',
  shadows: shadows.value,
  alpha: false,
  powerPreference: 'high-performance' as const,
  antialias: true,
  preserveDrawingBuffer: true
}))

const ambientIntensity = computed(() => 
  useEnvironmentLighting.value ? 0.25 : 0.5
)

const directionalIntensity = computed(() => 
  intensity.value * (useEnvironmentLighting.value ? 0.5 : 1)
)

// Watch for scene changes and setup shadows
watch(() => props.scene, (newScene) => {
  if (newScene) {
    setupSceneShadows(newScene)
  }
}, { immediate: true })

watch(shadows, (newShadows) => {
  if (props.scene) {
    setupSceneShadows(props.scene)
  }
})

// Methods
function setupSceneShadows(scene: THREE.Scene) {
  if (!scene) return
  
  try {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = shadows.value
        obj.receiveShadow = shadows.value
        
        // Set environment map intensity for materials
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => {
              if ('envMapIntensity' in mat) {
                mat.envMapIntensity = 0.8
              }
            })
          } else if ('envMapIntensity' in obj.material) {
            obj.material.envMapIntensity = 0.8
          }
        }
      }
    })
  } catch (err) {
    console.error('Error setting up scene shadows:', err)
    error.value = 'Failed to setup scene shadows'
  }
}

// Animation loop for any custom updates
const { onBeforeRender } = useRenderLoop()

onBeforeRender(() => {
  // Any custom render logic can go here
})

onMounted(() => {
  if (props.scene) {
    setupSceneShadows(props.scene)
  }
})
</script>

<style scoped>
.viewer-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.tres-canvas {
  width: 100%;
  height: 100%;
}

.loading-message,
.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 1.2rem;
  z-index: 100;
  background: rgba(0, 0, 0, 0.7);
  padding: 1rem 2rem;
  border-radius: 8px;
}

.error-message {
  color: #ff6b6b;
  border: 2px solid #ff6b6b;
}

.controls-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.control-group {
  margin-bottom: 1rem;
}

.control-group:last-child {
  margin-bottom: 0;
}

.control-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #333;
  cursor: pointer;
}

.control-group input[type="checkbox"] {
  margin-right: 0.5rem;
}

.control-group input[type="range"] {
  width: 100%;
  margin: 0.25rem 0;
}

.control-group select {
  width: 100%;
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.control-group span {
  font-weight: bold;
  color: #666;
  margin-left: 0.5rem;
}
</style>