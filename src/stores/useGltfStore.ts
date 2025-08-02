import { defineStore } from 'pinia'
import { saveAs } from 'file-saver'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { createVueZip } from '../utils/createVueZip'
import { parseToVue } from '../utils/vueGltfParser'
import type { Store } from 'pinia'

export interface GltfConfig {
  fileName?: string
  pathPrefix?: string
  types?: boolean
  useComposition?: boolean
  shadows?: boolean
  autoRotate?: boolean
  contactShadow?: boolean
  environment?: string
  preset?: string
  intensity?: number
  printwidth?: number
  instanceall?: boolean
}

// Define the store state type
interface GltfStoreState {
  fileName: string
  buffers: Map<string, ArrayBuffer> | null
  textOriginalFile: string
  animations: boolean
  code: string
  scene: THREE.Scene | null
  isLoading: boolean
  error: string | null
}

// Using any type to avoid TypeScript's complex type inference issue
// The store is still fully typed at runtime through Pinia's defineStore
export const useGltfStore: any = defineStore('gltf', {
  state: (): GltfStoreState => ({
    fileName: '',
    buffers: null as Map<string, ArrayBuffer> | null,
    textOriginalFile: '',
    animations: false,
    code: '',
    scene: null as THREE.Scene | null,
    isLoading: false,
    error: null as string | null
  }),

  actions: {
    async createVueZip(config: GltfConfig & { sandboxCode: any }) {
      try {
        this.isLoading = true
        if (!this.buffers || !this.code) {
          throw new Error('No buffers or code available')
        }
        
        const vueZipConfig = {
          ...config,
          buffers: this.buffers,
          code: this.code,
          fileName: this.fileName
        }
        
        const blob = await createVueZip(vueZipConfig)
        const fileName = this.fileName.split('.')[0]
        saveAs(blob, `${fileName}-vue.zip`)
      } catch (error) {
        this.error = `Failed to create zip: ${error instanceof Error ? error.message : 'Unknown error'}`
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async generateVueScene(config: GltfConfig) {
      try {
        this.isLoading = true
        this.error = null

        if (!this.buffers) {
          throw new Error('No buffers available')
        }

        const rawFileName = this.fileName
        const fileName = config.pathPrefix && config.pathPrefix !== '' 
          ? `${config.pathPrefix}/${rawFileName}` 
          : rawFileName

        let gltfResult: any

        if (this.buffers.size !== 1) {
          // Multiple files case
          const loadingManager = new THREE.LoadingManager()
          const dracoLoader = new DRACOLoader()
            .setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
          
          const gltfLoader = new GLTFLoader(loadingManager)
            .setDRACOLoader(dracoLoader)
            .setMeshoptDecoder(MeshoptDecoder)
            .setKTX2Loader(new KTX2Loader())

          gltfResult = await new Promise((resolve, reject) => {
            const objectURLs: string[] = []

            loadingManager.setURLModifier((path: string) => {
              const buffer = this.buffers!.get(path)
              if (!buffer) return path

              const url = URL.createObjectURL(new Blob([buffer]))
              objectURLs.push(url)
              return url
            })

            const gltfBuffer = this.buffers!.get(fileName)
            if (!gltfBuffer) {
              reject(new Error(`Buffer not found for ${fileName}`))
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
              fileName.slice(0, fileName.lastIndexOf('/') + 1),
              onLoad,
              onError
            )
          })
        } else {
          // Single file case
          const dracoLoader = new DRACOLoader()
            .setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
          
          const gltfLoader = new GLTFLoader()
            .setDRACOLoader(dracoLoader)
            .setMeshoptDecoder(MeshoptDecoder)
            .setKTX2Loader(new KTX2Loader())

          const bufferEntry = this.buffers!.entries().next()
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
          fileName,
          printwidth: config.printwidth || 100
        })

        this.code = vueCode
        this.animations = !!gltfResult.animations?.length
        
        if (!this.scene) {
          this.scene = gltfResult.scene
        }

      } catch (error) {
        this.error = `Failed to generate scene: ${error instanceof Error ? error.message : 'Unknown error'}`
        throw error
      } finally {
        this.isLoading = false
      }
    },

    setBuffers(buffers: Map<string, ArrayBuffer>) {
      this.buffers = buffers
    },

    setFileName(fileName: string) {
      this.fileName = fileName
    },

    setTextOriginalFile(text: string) {
      this.textOriginalFile = text
    },

    clearError() {
      this.error = null
    },

    reset() {
      this.fileName = ''
      this.buffers = null
      this.textOriginalFile = ''
      this.animations = false
      this.code = ''
      this.scene = null
      this.isLoading = false
      this.error = null
    }
  },

  getters: {
    hasBuffers: (state) => state.buffers !== null && state.buffers.size > 0,
    hasScene: (state) => state.scene !== null,
    hasCode: (state) => state.code !== '',
    isReady: (state) => state.buffers !== null && state.buffers.size > 0 && !state.isLoading && !state.error
  }
})