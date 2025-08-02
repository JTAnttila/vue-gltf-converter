import * as THREE from 'three'

export interface ParseConfig {
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
  framework?: 'vue3' | 'nuxt'
  pathPrefix?: string
}

interface ComponentData {
  imports: Set<string>
  components: string[]
  animations: string[]
  textures: Map<string, string>
  materials: Map<string, MaterialData>
  meshes: ComponentMesh[]
  lights: ComponentLight[]
  cameras: ComponentCamera[]
}

interface MaterialData {
  type: string
  props: Record<string, any>
  textures: string[]
}

interface ComponentMesh {
  name: string
  geometry: {
    type: string
    props: Record<string, any>
  }
  material: {
    type: string
    props: Record<string, any>
  }
  transform: {
    position?: [number, number, number]
    rotation?: [number, number, number]
    scale?: [number, number, number]
  }
  castShadow?: boolean
  receiveShadow?: boolean
}

interface ComponentLight {
  type: string
  props: Record<string, any>
  transform?: {
    position?: [number, number, number]
    rotation?: [number, number, number]
  }
}

interface ComponentCamera {
  type: string
  props: Record<string, any>
  transform?: {
    position?: [number, number, number]
    rotation?: [number, number, number]
  }
}

export async function parseToVue(gltf: any, config: ParseConfig): Promise<string> {
  const componentData: ComponentData = {
    imports: new Set(),
    components: [],
    animations: [],
    textures: new Map(),
    materials: new Map(),
    meshes: [],
    lights: [],
    cameras: []
  }

  // Add basic imports
  componentData.imports.add('TresGroup')
  componentData.imports.add('TresMesh')
  
  // Parse the scene
  parseScene(gltf.scene, componentData, config)
  
  // Parse animations
  if (gltf.animations && gltf.animations.length > 0) {
    parseAnimations(gltf.animations, componentData)
  }

  // Generate component code
  return generateComponent(componentData, config)
}

function parseScene(scene: THREE.Object3D, data: ComponentData, config: ParseConfig): void {
  scene.traverse((object: THREE.Object3D) => {
    if (object === scene) return // Skip root scene

    if (object instanceof THREE.Mesh) {
      parseMesh(object, data, config)
    } else if (object instanceof THREE.Light) {
      parseLight(object, data)
    } else if (object instanceof THREE.Camera) {
      parseCamera(object, data)
    }
  })
}

function parseMesh(mesh: THREE.Mesh, data: ComponentData, config: ParseConfig): void {
  const name = sanitizeName(mesh.name || `Mesh_${data.meshes.length}`)
  
  // Parse geometry
  const geometry = parseGeometry(mesh.geometry)
  
  // Parse material
  const material = parseMaterial(mesh.material, data)
  
  // Parse transform
  const transform = parseTransform(mesh)
  
  data.meshes.push({
    name,
    geometry,
    material,
    transform,
    castShadow: config.shadows && mesh.castShadow,
    receiveShadow: config.shadows && mesh.receiveShadow
  })
}

function parseGeometry(geometry: THREE.BufferGeometry): { type: string; props: Record<string, any> } {
  const type = geometry.type.replace('Geometry', '')
  const props: Record<string, any> = {}

  // Handle common geometry types
  if (geometry instanceof THREE.BoxGeometry) {
    const params = (geometry as any).parameters
    if (params) {
      props.args = [params.width || 1, params.height || 1, params.depth || 1]
    }
  } else if (geometry instanceof THREE.SphereGeometry) {
    const params = (geometry as any).parameters
    if (params) {
      props.args = [params.radius || 1, params.widthSegments || 32, params.heightSegments || 16]
    }
  } else if (geometry instanceof THREE.PlaneGeometry) {
    const params = (geometry as any).parameters
    if (params) {
      props.args = [params.width || 1, params.height || 1]
    }
  } else if (geometry instanceof THREE.CylinderGeometry) {
    const params = (geometry as any).parameters
    if (params) {
      props.args = [params.radiusTop || 1, params.radiusBottom || 1, params.height || 1]
    }
  }

  return { type, props }
}

function parseMaterial(material: THREE.Material | THREE.Material[], data: ComponentData): { type: string; props: Record<string, any> } {
  if (Array.isArray(material)) {
    // Handle multiple materials (use first one for simplicity)
    material = material[0]
  }

  const props: Record<string, any> = {}
  let type = 'TresMeshBasicMaterial'

  if (material instanceof THREE.MeshStandardMaterial) {
    type = 'TresMeshStandardMaterial'
    data.imports.add('TresMeshStandardMaterial')
    
    if (material.color) props.color = `0x${material.color.getHexString()}`
    if (material.roughness !== 1) props.roughness = material.roughness
    if (material.metalness !== 0) props.metalness = material.metalness
    if (material.emissive && material.emissive.getHex() !== 0) {
      props.emissive = `0x${material.emissive.getHexString()}`
    }
  } else if (material instanceof THREE.MeshPhysicalMaterial) {
    type = 'TresMeshPhysicalMaterial'
    data.imports.add('TresMeshPhysicalMaterial')
    
    if (material.color) props.color = `0x${material.color.getHexString()}`
    if (material.roughness !== 1) props.roughness = material.roughness
    if (material.metalness !== 0) props.metalness = material.metalness
    if (material.clearcoat !== 0) props.clearcoat = material.clearcoat
  } else if (material instanceof THREE.MeshLambertMaterial) {
    type = 'TresMeshLambertMaterial'
    data.imports.add('TresMeshLambertMaterial')
    
    if (material.color) props.color = `0x${material.color.getHexString()}`
  } else {
    data.imports.add('TresMeshBasicMaterial')
    if ('color' in material && material.color) {
      props.color = `0x${(material.color as THREE.Color).getHexString()}`
    }
  }

  // Common material properties
  if (material.transparent) props.transparent = true
  if (material.opacity !== 1) props.opacity = material.opacity
  if (material.side !== THREE.FrontSide) {
    props.side = material.side === THREE.BackSide ? 'BackSide' : 'DoubleSide'
  }

  return { type, props }
}

function parseLight(light: THREE.Light, data: ComponentData): void {
  let type = 'TresAmbientLight'
  const props: Record<string, any> = {}
  const transform = parseTransform(light)

  if (light instanceof THREE.DirectionalLight) {
    type = 'TresDirectionalLight'
    data.imports.add('TresDirectionalLight')
    props.intensity = light.intensity
    if (light.color.getHex() !== 0xffffff) {
      props.color = `0x${light.color.getHexString()}`
    }
  } else if (light instanceof THREE.AmbientLight) {
    type = 'TresAmbientLight'
    data.imports.add('TresAmbientLight')
    props.intensity = light.intensity
    if (light.color.getHex() !== 0xffffff) {
      props.color = `0x${light.color.getHexString()}`
    }
  } else if (light instanceof THREE.PointLight) {
    type = 'TresPointLight'
    data.imports.add('TresPointLight')
    props.intensity = light.intensity
    props.distance = light.distance
    if (light.color.getHex() !== 0xffffff) {
      props.color = `0x${light.color.getHexString()}`
    }
  } else if (light instanceof THREE.SpotLight) {
    type = 'TresSpotLight'
    data.imports.add('TresSpotLight')
    props.intensity = light.intensity
    props.distance = light.distance
    props.angle = light.angle
    props.penumbra = light.penumbra
    if (light.color.getHex() !== 0xffffff) {
      props.color = `0x${light.color.getHexString()}`
    }
  }

  data.lights.push({ type, props, transform })
}

function parseCamera(camera: THREE.Camera, data: ComponentData): void {
  let type = 'TresPerspectiveCamera'
  const props: Record<string, any> = {}
  const transform = parseTransform(camera)

  if (camera instanceof THREE.PerspectiveCamera) {
    type = 'TresPerspectiveCamera'
    data.imports.add('TresPerspectiveCamera')
    props.fov = camera.fov
    props.aspect = camera.aspect
    props.near = camera.near
    props.far = camera.far
  } else if (camera instanceof THREE.OrthographicCamera) {
    type = 'TresOrthographicCamera'
    data.imports.add('TresOrthographicCamera')
    props.left = camera.left
    props.right = camera.right
    props.top = camera.top
    props.bottom = camera.bottom
    props.near = camera.near
    props.far = camera.far
  }

  data.cameras.push({ type, props, transform })
}

function parseTransform(object: THREE.Object3D) {
  const transform: any = {}

  if (object.position.x !== 0 || object.position.y !== 0 || object.position.z !== 0) {
    transform.position = [
      Number(object.position.x.toFixed(3)),
      Number(object.position.y.toFixed(3)),
      Number(object.position.z.toFixed(3))
    ]
  }

  if (object.rotation.x !== 0 || object.rotation.y !== 0 || object.rotation.z !== 0) {
    transform.rotation = [
      Number(object.rotation.x.toFixed(3)),
      Number(object.rotation.y.toFixed(3)),
      Number(object.rotation.z.toFixed(3))
    ]
  }

  if (object.scale.x !== 1 || object.scale.y !== 1 || object.scale.z !== 1) {
    transform.scale = [
      Number(object.scale.x.toFixed(3)),
      Number(object.scale.y.toFixed(3)),
      Number(object.scale.z.toFixed(3))
    ]
  }

  return transform
}

function parseAnimations(animations: THREE.AnimationClip[], data: ComponentData): void {
  data.imports.add('useAnimations')
  animations.forEach((clip, index) => {
    const name = sanitizeName(clip.name || `Animation_${index}`)
    data.animations.push(name)
  })
}

function generateComponent(data: ComponentData, config: ParseConfig): string {
  const componentName = getComponentName(config.fileName)
  
  if (config.useComposition !== false) {
    return generateCompositionComponent(data, config, componentName)
  } else {
    return generateOptionsComponent(data, config, componentName)
  }
}

function generateCompositionComponent(data: ComponentData, config: ParseConfig, componentName: string): string {
  const imports = generateImports(data, config)
  const props = generateProps(config)
  const setup = generateSetup(data, config)
  const template = generateTemplate(data, config)

  return `<template>
${template}
</template>

<script setup${config.types ? ' lang="ts"' : ''}>
${imports}

${props}

${setup}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>`
}

function generateOptionsComponent(data: ComponentData, config: ParseConfig, componentName: string): string {
  const imports = generateImports(data, config)
  const template = generateTemplate(data, config)

  return `<template>
${template}
</template>

<script${config.types ? ' lang="ts"' : ''}>
${imports}

export default {
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
  }
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>`
}

function generateImports(data: ComponentData, config: ParseConfig): string {
  const tresImports = Array.from(data.imports).sort()
  const vueImports = config.useComposition !== false 
    ? ['ref', 'onMounted'] 
    : []
  
  const hasAnimations = data.animations.length > 0
  const cientos = hasAnimations ? ['useGLTF', 'useAnimations'] : ['useGLTF']

  return `${config.types ? "import type { Ref } from 'vue'" : ''}
import { ${vueImports.join(', ')} } from 'vue'
import { ${tresImports.join(', ')} } from '@tresjs/core'
import { ${cientos.join(', ')} } from '@tresjs/cientos'`
}

function generateProps(config: ParseConfig): string {
  if (config.types) {
    return `interface Props {
  path?: string
}

const props = withDefaults(defineProps<Props>(), {
  path: '/${config.fileName}'
})`
  } else {
    return `const props = defineProps({
  path: {
    type: String,
    default: '/${config.fileName}'
  }
})`
  }
}

function generateSetup(data: ComponentData, config: ParseConfig): string {
  const hasAnimations = data.animations.length > 0
  
  const modelLoad = `// Load GLTF model
const { scene, animations } = await useGLTF(props.path)`

  const animationSetup = hasAnimations ? `
const group = ref()
const { mixer, actions } = useAnimations(animations, group)

onMounted(() => {
  // Play all animations
  Object.values(actions).forEach(action => {
    action?.play()
  })
})` : ''

  return `${modelLoad}
${animationSetup}`
}

function generateTemplate(data: ComponentData, config: ParseConfig): string {
  const hasAnimations = data.animations.length > 0
  const groupRef = hasAnimations ? ' ref="group"' : ''
  
  const lights = data.lights.map(light => generateLightTemplate(light)).join('\n')
  const meshes = data.meshes.map(mesh => generateMeshTemplate(mesh, config)).join('\n')
  const cameras = data.cameras.map(camera => generateCameraTemplate(camera)).join('\n')

  return `  <TresGroup${groupRef}>
${lights}
${meshes}
${cameras}
    <!-- GLTF Scene -->
    <primitive :object="scene" />
  </TresGroup>`
}

function generateLightTemplate(light: ComponentLight): string {
  const props = Object.entries(light.props)
    .map(([key, value]) => `:${key}="${value}"`)
    .join(' ')
  
  const transform = generateTransformProps(light.transform)
  
  return `    <${light.type}${transform}${props ? ' ' + props : ''} />`
}

function generateMeshTemplate(mesh: ComponentMesh, config: ParseConfig): string {
  const transform = generateTransformProps(mesh.transform)
  const shadows = config.shadows && (mesh.castShadow || mesh.receiveShadow) 
    ? ` cast-shadow receive-shadow` 
    : ''
  
  const geometryProps = Object.entries(mesh.geometry.props)
    .map(([key, value]) => `:${key}="${JSON.stringify(value)}"`)
    .join(' ')
  
  const materialProps = Object.entries(mesh.material.props)
    .map(([key, value]) => `:${key}="${value}"`)
    .join(' ')

  return `    <!-- ${mesh.name} -->
    <TresMesh${transform}${shadows}>
      <Tres${mesh.geometry.type}Geometry${geometryProps ? ' ' + geometryProps : ''} />
      <${mesh.material.type}${materialProps ? ' ' + materialProps : ''} />
    </TresMesh>`
}

function generateCameraTemplate(camera: ComponentCamera): string {
  const props = Object.entries(camera.props)
    .map(([key, value]) => `:${key}="${value}"`)
    .join(' ')
  
  const transform = generateTransformProps(camera.transform)
  
  return `    <${camera.type}${transform}${props ? ' ' + props : ''} />`
}

function generateTransformProps(transform?: any): string {
  if (!transform) return ''
  
  const props: string[] = []
  
  if (transform.position) {
    props.push(`:position="[${transform.position.join(', ')}]"`)
  }
  if (transform.rotation) {
    props.push(`:rotation="[${transform.rotation.join(', ')}]"`)
  }
  if (transform.scale) {
    props.push(`:scale="[${transform.scale.join(', ')}]"`)
  }
  
  return props.length > 0 ? ' ' + props.join(' ') : ''
}

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/^(\d)/, '_$1')
    .replace(/^_+|_+$/g, '')
    || 'Component'
}

function getComponentName(fileName: string): string {
  const baseName = fileName.split('/').pop()?.split('.')[0] || 'Model'
  return baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/[^a-zA-Z0-9]/g, '')
}