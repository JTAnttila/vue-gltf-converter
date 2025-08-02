import * as THREE from 'three'

interface ParseConfig {
  fileName: string
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

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/^(\d)/, '_$1')
    .replace(/^_+|_+$/g, '')
    || 'Mesh'
}

function generateMeshComponent(mesh: THREE.Mesh, index: number, config: ParseConfig): string {
  const name = sanitizeName(mesh.name || `Mesh_${index}`)
  const geometry = mesh.geometry
  const material = mesh.material

  let geometryProps = ''
  let materialProps = ''

  // Handle geometry
  if (geometry.type === 'BoxGeometry') {
    const box = geometry as THREE.BoxGeometry
    geometryProps = `:args="[${box.parameters?.width || 1}, ${box.parameters?.height || 1}, ${box.parameters?.depth || 1}]"`
  } else if (geometry.type === 'SphereGeometry') {
    const sphere = geometry as THREE.SphereGeometry
    geometryProps = `:args="[${sphere.parameters?.radius || 1}]"`
  } else if (geometry.type === 'PlaneGeometry') {
    const plane = geometry as THREE.PlaneGeometry
    geometryProps = `:args="[${plane.parameters?.width || 1}, ${plane.parameters?.height || 1}]"`
  }

  // Handle material
  if (Array.isArray(material)) {
    materialProps = 'color="0xffffff"'
  } else {
    const mat = material as THREE.Material
    if ('color' in mat && mat.color) {
      materialProps = `color="0x${mat.color.getHexString()}"`
    }
    if ('transparent' in mat && mat.transparent) {
      materialProps += ` transparent`
    }
    if ('opacity' in mat && mat.opacity !== undefined && mat.opacity < 1) {
      materialProps += ` :opacity="${mat.opacity}"`
    }
  }

  const position = mesh.position
  const rotation = mesh.rotation
  const scale = mesh.scale

  let transformProps = ''
  if (position.x !== 0 || position.y !== 0 || position.z !== 0) {
    transformProps += ` :position="[${position.x}, ${position.y}, ${position.z}]"`
  }
  if (rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0) {
    transformProps += ` :rotation="[${rotation.x}, ${rotation.y}, ${rotation.z}]"`
  }
  if (scale.x !== 1 || scale.y !== 1 || scale.z !== 1) {
    transformProps += ` :scale="[${scale.x}, ${scale.y}, ${scale.z}]"`
  }

  const shadowProps = config.shadows ? ' cast-shadow receive-shadow' : ''

  if (config.useComposition) {
    return `    <!-- ${name} -->
    <TroisMesh${transformProps}${shadowProps}>
      <${geometry.type.replace('Geometry', '')}Geometry${geometryProps} />
      <BasicMaterial ${materialProps} />
    </TroisMesh>`
  } else {
    return `    <!-- ${name} -->
    <trois-mesh${transformProps}${shadowProps}>
      <${geometry.type.replace('Geometry', '').toLowerCase()}-geometry${geometryProps} />
      <basic-material ${materialProps} />
    </trois-mesh>`
  }
}

export async function parseToVue(gltf: any, config: ParseConfig): Promise<string> {
  const scene = gltf.scene
  const animations = gltf.animations || []
  const hasAnimations = animations.length > 0

  let meshComponents: string[] = []
  let lightComponents: string[] = []
  
  scene.traverse((object: THREE.Object3D) => {
    if (object instanceof THREE.Mesh) {
      meshComponents.push(generateMeshComponent(object, meshComponents.length, config))
    } else if (object instanceof THREE.Light) {
      // Handle lights
      const position = object.position
      const positionStr = position.x !== 0 || position.y !== 0 || position.z !== 0 
        ? ` :position="[${position.x}, ${position.y}, ${position.z}]"` 
        : ''
      
      if (object instanceof THREE.DirectionalLight) {
        lightComponents.push(`    <DirectionalLight${positionStr} :intensity="${object.intensity}" />`)
      } else if (object instanceof THREE.AmbientLight) {
        lightComponents.push(`    <AmbientLight :intensity="${object.intensity}" />`)
      } else if (object instanceof THREE.PointLight) {
        lightComponents.push(`    <PointLight${positionStr} :intensity="${object.intensity}" />`)
      }
    }
  })

  const componentName = sanitizeName(config.fileName.split('/').pop()?.split('.')[0] || 'Model')

  if (config.useComposition) {
    // Composition API version
    return generateCompositionComponent(componentName, meshComponents, lightComponents, hasAnimations, config)
  } else {
    // Options API version
    return generateOptionsComponent(componentName, meshComponents, lightComponents, hasAnimations, config)
  }
}

function generateCompositionComponent(
  componentName: string, 
  meshComponents: string[], 
  lightComponents: string[], 
  hasAnimations: boolean, 
  config: ParseConfig
): string {
  const imports = config.types 
    ? `import { defineComponent, ref, onMounted } from 'vue'
import { useGLTF, useAnimations } from '@tresjs/cientos'`
    : `import { defineComponent, ref, onMounted } from 'vue'
import { useGLTF, useAnimations } from '@tresjs/cientos'`

  const animationSetup = hasAnimations ? `
  const { mixer, actions } = useAnimations(animations, group)
  
  onMounted(() => {
    // Play all animations
    Object.values(actions).forEach(action => {
      action?.play()
    })
  })` : ''

  return `<template>
  <TresGroup ref="group">
${lightComponents.join('\n')}
${meshComponents.join('\n')}
    <!-- Load GLTF model directly -->
    <primitive :object="scene" />
  </TresGroup>
</template>

<script setup${config.types ? ' lang="ts"' : ''}>
${imports}

${config.types ? `
interface Props {
  path?: string
}

const props = withDefaults(defineProps<Props>(), {
  path: '/${config.fileName}'
})` : `
const props = defineProps({
  path: {
    type: String,
    default: '/${config.fileName}'
  }
})`}

const group = ref()

// Load GLTF model
const { scene, animations } = await useGLTF(props.path)
${animationSetup}
</script>`
}

function generateOptionsComponent(
  componentName: string, 
  meshComponents: string[], 
  lightComponents: string[], 
  hasAnimations: boolean, 
  config: ParseConfig
): string {
  const animationMethods = hasAnimations ? `
  mounted() {
    // Setup animations
    if (this.animations && this.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.$refs.group)
      this.animations.forEach(clip => {
        const action = this.mixer.clipAction(clip)
        action.play()
      })
    }
  },
  beforeUnmount() {
    if (this.mixer) {
      this.mixer.stopAllAction()
    }
  },` : ''

  return `<template>
  <TresGroup ref="group">
${lightComponents.join('\n')}
${meshComponents.join('\n')}
    <!-- Load GLTF model directly -->
    <primitive :object="scene" />
  </TresGroup>
</template>

<script${config.types ? ' lang="ts"' : ''}>
import { defineComponent } from 'vue'
import { useGLTF } from '@tresjs/cientos'
import * as THREE from 'three'

export default defineComponent({
  name: '${componentName}',
  props: {
    path: {
      type: String,
      default: '/${config.fileName}'
    }
  },
  async setup(props) {
    const { scene, animations } = await useGLTF(props.path)
    
    return {
      scene,
      animations
    }
  },${animationMethods}
})
</script>`
}