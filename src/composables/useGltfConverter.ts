import { ref, computed, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'

export interface UseGltfConverterOptions {
  dracoDecoderPath?: string
  autoLoad?: boolean
  onProgress?: (progress: ProgressEvent) => void
  onError?: (error: Error) => void
  onLoad?: (gltf: any) => void
}

export interface GltfConversionResult {
  scene: THREE.Scene | null
  animations: THREE.AnimationClip[]
  cameras: THREE.Camera[]
  mixer: THREE.AnimationMixer | null
  actions: Record<string, THREE.AnimationAction>
}

export function useGltfConverter(
  path?: string,
  options: UseGltfConverterOptions = {}
): any {
  const {
    dracoDecoderPath = 'https://www.gstatic.com/draco/v1/decoders/',
    autoLoad = true,
    onProgress,
    onError,
    onLoad
  } = options

  // State
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const progress = ref(0)
  const gltf = ref<any>(null)
  const scene = ref<THREE.Scene | null>(null)
  const animations = ref<THREE.AnimationClip[]>([])
  const cameras = ref<THREE.Camera[]>([])
  const mixer = ref<THREE.AnimationMixer | null>(null)
  const actions = ref<Record<string, THREE.AnimationAction>>({})

  // Loader setup
  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath(dracoDecoderPath)
  
  // Fix: Create KTX2Loader instance and set transcoder path
  const ktx2Loader = new KTX2Loader()
  ktx2Loader.setTranscoderPath('https://www.gstatic.com/basis/')
  
  loader.setDRACOLoader(dracoLoader)
  loader.setMeshoptDecoder(MeshoptDecoder)
  loader.setKTX2Loader(ktx2Loader) // Fix: Use KTX2Loader instead of KTXLoader

  // Computed
  const isReady = computed(() => !isLoading.value && !error.value && scene.value !== null)
  const hasAnimations = computed(() => animations.value.length > 0)
  const progressPercent = computed(() => Math.round(progress.value * 100))

  // Methods
  async function load(modelPath: string): Promise<GltfConversionResult> {
    try {
      isLoading.value = true
      error.value = null
      progress.value = 0

      const result = await new Promise<any>((resolve, reject) => {
        loader.load(
          modelPath,
          (gltfData) => {
            gltf.value = gltfData
            resolve(gltfData)
          },
          (progressEvent) => {
            if (progressEvent.lengthComputable) {
              progress.value = progressEvent.loaded / progressEvent.total
            }
            onProgress?.(progressEvent)
          },
          (err) => {
            error.value = err instanceof Error ? err : new Error('Failed to load GLTF')
            reject(err)
          }
        )
      })

      // Process the loaded GLTF
      scene.value = result.scene
      animations.value = result.animations || []
      cameras.value = result.cameras || []

      // Setup animation mixer if animations exist
      if (animations.value.length > 0 && scene.value) {
        mixer.value = new THREE.AnimationMixer(scene.value)
        
        // Create actions for all animations
        const newActions: Record<string, THREE.AnimationAction> = {}
        animations.value.forEach((clip, index) => {
          const action = mixer.value!.clipAction(clip)
          newActions[clip.name || `animation_${index}`] = action
        })
        actions.value = newActions
      }

      onLoad?.(result)

      return {
        scene: scene.value,
        animations: animations.value,
        cameras: cameras.value,
        mixer: mixer.value,
        actions: actions.value
      }
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error('Unknown error')
      error.value = errorInstance
      onError?.(errorInstance)
      throw errorInstance
    } finally {
      isLoading.value = false
    }
  }

  function playAnimation(name: string, options: { loop?: boolean; fadeIn?: number } = {}) {
    const action = actions.value[name]
    if (!action) {
      console.warn(`Animation "${name}" not found`)
      return
    }

    action.reset()
    if (options.loop) {
      action.setLoop(THREE.LoopRepeat, Infinity)
    }
    
    if (options.fadeIn) {
      action.fadeIn(options.fadeIn)
    }
    
    action.play()
  }

  function stopAnimation(name: string, fadeOut?: number) {
    const action = actions.value[name]
    if (!action) {
      console.warn(`Animation "${name}" not found`)
      return
    }

    if (fadeOut) {
      action.fadeOut(fadeOut)
    } else {
      action.stop()
    }
  }

  function stopAllAnimations() {
    Object.values(actions.value).forEach(action => action.stop())
  }

  function updateMixer(deltaTime: number) {
    if (mixer.value) {
      mixer.value.update(deltaTime)
    }
  }

  // Auto-load if path is provided
  if (path && autoLoad) {
    load(path)
  }

  // Watch for path changes
  watch(() => path, (newPath) => {
    if (newPath && autoLoad) {
      load(newPath)
    }
  })

  return {
    // State
    isLoading,
    error,
    progress,
    gltf,
    scene,
    animations,
    cameras,
    mixer,
    actions,
    
    // Computed
    isReady,
    hasAnimations,
    progressPercent,
    
    // Methods
    load,
    playAnimation,
    stopAnimation,
    stopAllAnimations,
    updateMixer
  }
}