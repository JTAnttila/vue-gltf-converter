// src/stores/useGltfStore.ts
import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
// Fix: Import KTX2Loader instead of KTXLoader
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { parseToVue } from '../utils/vueGltfParser'
import { createVueZip } from '../utils/createVueZip'

export interface GltfConfig {
  types?: boolean
  useComposition?: boolean
  shadows?: boolean
  autoRotate?: boolean
  contactShadow?: boolean
  environment?: string
  preset?: string
  intensity?: number
  instanceall?: boolean
  framework?: 'vue3' | 'nuxt'
  pathPrefix?: string
  printwidth?: number
}

// Define the store return type interface
interface GltfStoreReturn {
  // State
  isLoading: Ref<boolean>
  error: Ref<string | null>
  fileName: Ref<string>
  code: Ref<string>
  buffers: Ref<Map<string, ArrayBuffer> | null>
  animations: Ref<THREE.AnimationClip[]>
  cameras: Ref<THREE.Camera[]>
  scene: Ref<THREE.Group | null>
  
  // Getters
  hasCode: Ref<boolean>
  hasAnimations: Ref<boolean>
  hasScene: () => boolean
  
  // Actions
  clearError: () => void
  setFileName: (newFileName: string) => void
  setBuffers: (newBuffers: Map<string, ArrayBuffer>, newFileName?: string) => void
  reset: () => void
  downloadVueProject: (config: GltfConfig) => Promise<void>
  generateVueScene: (config: GltfConfig) => Promise<void>
}

export const useGltfStore = defineStore('gltf', (): GltfStoreReturn => {
  // State
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const fileName = ref('')
  const code = ref('')
  const buffers = ref<Map<string, ArrayBuffer> | null>(null)
  const animations = ref<THREE.AnimationClip[]>([])
  const cameras = ref<THREE.Camera[]>([])
  const scene = ref<THREE.Group | null>(null)

  // Getters
  const hasCode = ref(false)
  const hasAnimations = ref(false)

  // Actions
  function clearError() {
    error.value = null
  }

  function setFileName(newFileName: string) {
    fileName.value = newFileName
    error.value = null
  }

  function setBuffers(newBuffers: Map<string, ArrayBuffer>, newFileName?: string) {
    buffers.value = newBuffers
    if (newFileName) {
      fileName.value = newFileName
    }
    code.value = ''
    error.value = null
  }

  function reset() {
    fileName.value = ''
    code.value = ''
    buffers.value = null
    animations.value = []
    cameras.value = []
    scene.value = null
    hasCode.value = false
    hasAnimations.value = false
    error.value = null
    isLoading.value = false
  }

  function hasScene() {
    return scene.value !== null
  }

  async function downloadVueProject(config: GltfConfig) {
    try {
      isLoading.value = true
      error.value = null

      if (!buffers.value || !fileName.value) {
        throw new Error('No GLTF file loaded')
      }

      if (!code.value) {
        throw new Error('No Vue component generated')
      }

      const vueZipConfig = {
        ...config,
        buffers: buffers.value,
        code: code.value,
        fileName: fileName.value
      }

      const blob = await createVueZip(vueZipConfig)
      const projectName = fileName.value.split('.')[0]
      saveAs(blob, `${projectName}-vue.zip`)
    } catch (err) {
      error.value = `Failed to create zip: ${err instanceof Error ? err.message : 'Unknown error'}`
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function generateVueScene(config: GltfConfig) {
    try {
      isLoading.value = true
      error.value = null

      if (!buffers.value) {
        throw new Error('No buffers available')
      }

      const rawFileName = fileName.value
      const finalFileName: string = config.pathPrefix && config.pathPrefix !== '' 
        ? `${config.pathPrefix}/${rawFileName}` 
        : rawFileName

      let gltfResult: any

      if (buffers.value.size !== 1) {
        // Multiple files case
        const loadingManager = new THREE.LoadingManager()
        const dracoLoader = new DRACOLoader()
          .setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
        
        // Fix: Use KTX2Loader instead of undefined KTX2Loader
        const ktx2Loader = new KTX2Loader()
        ktx2Loader.setTranscoderPath('https://www.gstatic.com/basis/')
        
        const gltfLoader = new GLTFLoader(loadingManager)
          .setDRACOLoader(dracoLoader)
          .setMeshoptDecoder(MeshoptDecoder)
          .setKTX2Loader(ktx2Loader)

        gltfResult = await new Promise((resolve, reject) => {
          const objectURLs: string[] = []

          loadingManager.setURLModifier((path: string) => {
            const buffer = buffers.value!.get(path)
            if (!buffer) return path

            const url = URL.createObjectURL(new Blob([buffer]))
            objectURLs.push(url)
            return url
          })

          const gltfBuffer = buffers.value!.get(finalFileName)
          if (!gltfBuffer) {
            reject(new Error(`Buffer not found for ${finalFileName}`))
            return
          }

          const onLoad = (gltf: any) => {
            // Clean up object URLs
            objectURLs.forEach(URL.revokeObjectURL)
            resolve(gltf)
          }

          const onError = (error: any) => {
            objectURLs.forEach(URL.revokeObjectURL)
            reject(error)
          }

          gltfLoader.parse(
            gltfBuffer,
            finalFileName.slice(0, finalFileName.lastIndexOf('/') + 1),
            onLoad,
            onError
          )
        })
      } else {
        // Single file case
        const dracoLoader = new DRACOLoader()
          .setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
        
        // Fix: Use KTX2Loader instead of undefined KTX2Loader
        const ktx2Loader = new KTX2Loader()
        ktx2Loader.setTranscoderPath('https://www.gstatic.com/basis/')
        
        const gltfLoader = new GLTFLoader()
          .setDRACOLoader(dracoLoader)
          .setMeshoptDecoder(MeshoptDecoder)
          .setKTX2Loader(ktx2Loader)

        const bufferEntry = buffers.value!.entries().next()
        if (bufferEntry.done || !bufferEntry.value) {
          throw new Error('No buffer found')
        }
        const buffer = bufferEntry.value[1]
        gltfResult = await new Promise((resolve, reject) => {
          gltfLoader.parse(buffer, '', resolve, reject)
        })
      }

      // Parse GLTF to Vue component code
      const vueCode = await parseToVue(gltfResult, {
        ...config,
        fileName: finalFileName,
        printwidth: config.printwidth || 100
      })

      code.value = vueCode
      animations.value = gltfResult.animations || []
      cameras.value = gltfResult.cameras || []
      scene.value = gltfResult.scene
      hasCode.value = true
      hasAnimations.value = (gltfResult.animations?.length || 0) > 0

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      error.value = `Failed to generate Vue scene: ${errorMessage}`
      console.error('generateVueScene error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    isLoading,
    error,
    fileName,
    code,
    buffers,
    animations,
    cameras,
    scene,
    
    // Getters
    hasCode,
    hasAnimations,
    hasScene,
    
    // Actions
    clearError,
    setFileName,
    setBuffers,
    reset,
    downloadVueProject,
    generateVueScene
  }
})