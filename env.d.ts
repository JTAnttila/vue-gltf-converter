/// <reference types="vite/client" />
/// <reference types="three" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@tresjs/core' {
  import type { DefineComponent } from 'vue'
  export const TresCanvas: DefineComponent<any, any, any>
  export const TresGroup: DefineComponent<any, any, any>
  export const TresMesh: DefineComponent<any, any, any>
  export const TresPerspectiveCamera: DefineComponent<any, any, any>
  export const TresAmbientLight: DefineComponent<any, any, any>
  export const TresDirectionalLight: DefineComponent<any, any, any>
  export const useRenderLoop: () => any
}

declare module '@tresjs/cientos' {
  import type { DefineComponent } from 'vue'
  export const OrbitControls: DefineComponent<any, any, any>
  export const Environment: DefineComponent<any, any, any>
  export const ContactShadows: DefineComponent<any, any, any>
  export const useGLTF: (path: string) => Promise<any>
  export const useAnimations: (animations: any[], target: any) => any
}
