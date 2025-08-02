import { ref, computed, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { KTXLoader } from 'three-stdlib'

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
) {
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
  loader.setDRACOLoader(dracoLoader)
  loader.setMeshoptDecoder(MeshoptDecoder)
  loader.setKTX2Loader(new KTXLoader())

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
            const error = new Error(`Failed to load GLTF model: ${err.message || err}`)
            reject(error)
          }
        )
      })

      // Process the loaded GLTF
      scene.value = result.scene
      animations.value = result.animations || []
      cameras.value = result.cameras || []

      // Setup animations if present
      if (animations.value.length > 0) {
        mixer.value = new THREE.AnimationMixer(scene.value)
        const actionsMap: Record<string, THREE.AnimationAction> = {}
        
        animations.value.forEach((clip) => {
          const action = mixer.value!.clipAction(clip)
          actionsMap[clip.name] = action
        })
        
        actions.value = actionsMap
      }

      // Setup shadows and materials
      setupSceneDefaults(scene.value)

      onLoad?.(result)

      return {
        scene: scene.value,
        animations: animations.value,
        cameras: cameras.value,
        mixer: mixer.value,
        actions: actions.value
      }

    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      error.value = errorObj
      onError?.(errorObj)
      throw errorObj
    } finally {
      isLoading.value = false
    }
  }

  function setupSceneDefaults(sceneObj: THREE.Scene) {
    sceneObj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        // Enhance materials
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(enhanceMaterial)
          } else {
            enhanceMaterial(child.material)
          }
        }
      }
    })
  }

  function enhanceMaterial(material: THREE.Material) {
    if ('envMapIntensity' in material) {
      material.envMapIntensity = 0.8
    }
    if ('roughness' in material && material.roughness === undefined) {
      material.roughness = 0.5
    }
    if ('metalness' in material && material.metalness === undefined) {
      material.metalness = 0.1
    }
  }

  function playAnimation(name?: string) {
    if (!mixer.value) return

    if (name && actions.value[name]) {
      // Play specific animation
      Object.values(actions.value).forEach(action => action.stop())
      actions.value[name].play()
    } else {
      // Play all animations
      Object.values(actions.value).forEach(action => action.play())
    }
  }

  function stopAnimation(name?: string) {
    if (!mixer.value) return

    if (name && actions.value[name]) {
      actions.value[name].stop()
    } else {
      Object.values(actions.value).forEach(action => action.stop())
    }
  }

  function pauseAnimation(name?: string) {
    if (!mixer.value) return

    if (name && actions.value[name]) {
      actions.value[name].paused = true
    } else {
      Object.values(actions.value).forEach(action => {
        action.paused = true
      })
    }
  }

  function resumeAnimation(name?: string) {
    if (!mixer.value) return

    if (name && actions.value[name]) {
      actions.value[name].paused = false
    } else {
      Object.values(actions.value).forEach(action => {
        action.paused = false
      })
    }
  }

  function updateAnimations(delta: number) {
    if (mixer.value) {
      mixer.value.update(delta)
    }
  }

  function dispose() {
    if (mixer.value) {
      mixer.value.stopAllAction()
      mixer.value.uncacheRoot(mixer.value.getRoot())
    }
    
    if (scene.value) {
      scene.value.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose())
          } else if (child.material) {
            child.material.dispose()
          }
        }
      })
    }

    // Reset state
    gltf.value = null
    scene.value = null
    animations.value = []
    cameras.value = []
    mixer.value = null
    actions.value = {}
    error.value = null
    progress.value = 0
  }

  // Auto-load if path is provided
  if (path && autoLoad) {
    load(path).catch(() => {
      // Error is already handled in the load function
    })
  }

  // Cleanup on unmount
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', dispose)
  }

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    progress: readonly(progress),
    gltf: readonly(gltf),
    scene: readonly(scene),
    animations: readonly(animations),
    cameras: readonly(cameras),
    mixer: readonly(mixer),
    actions: readonly(actions),

    // Computed
    isReady,
    hasAnimations,
    progressPercent,

    // Methods
    load,
    playAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    updateAnimations,
    dispose
  }
}

// Helper composable for animation loop integration
export function useGltfAnimationLoop(
  converterInstance: ReturnType<typeof useGltfConverter>
) {
  const clock = new THREE.Clock()
  let animationId: number | null = null

  function startAnimationLoop() {
    if (animationId !== null) return

    function animate() {
      const delta = clock.getDelta()
      converterInstance.updateAnimations(delta)
      animationId = requestAnimationFrame(animate)
    }

    animate()
  }

  function stopAnimationLoop() {
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  // Auto-start when animations are available
  watch(() => converterInstance.hasAnimations.value, (hasAnims) => {
    if (hasAnims) {
      startAnimationLoop()
    } else {
      stopAnimationLoop()
    }
  })

  return {
    startAnimationLoop,
    stopAnimationLoop
  }
}

// Utility function to preload multiple GLTF models
export async function preloadGltfModels(
  models: Array<{ name: string; path: string }>,
  options: UseGltfConverterOptions = {}
): Promise<Record<string, GltfConversionResult>> {
  const results: Record<string, GltfConversionResult> = {}
  
  const loadPromises = models.map(async (model) => {
    const converter = useGltfConverter(undefined, { autoLoad: false, ...options })
    const result = await converter.load(model.path)
    results[model.name] = result
    return result
  })

  await Promise.all(loadPromises)
  return results
}