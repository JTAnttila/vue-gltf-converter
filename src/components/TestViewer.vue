<template>
  <div class="test-viewer">
    <div class="test-content">
      <h3>3D Viewer Test</h3>
      <p>Buffers: {{ buffers ? buffers.size : 0 }} files</p>
      <p>File: {{ fileName || 'No file' }}</p>
      <p>Shadows: {{ shadows }}</p>
      <p>Environment: {{ environment }}</p>
      
      <div class="test-canvas">
        <div class="canvas-placeholder">
          3D Canvas should render here
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  buffers?: Map<string, ArrayBuffer> | null
  fileName?: string
  shadows?: boolean
  contactShadow?: boolean
  autoRotate?: boolean
  environment?: string
  intensity?: number
}

const props = withDefaults(defineProps<Props>(), {
  buffers: null,
  fileName: '',
  shadows: true,
  contactShadow: false,
  autoRotate: false,
  environment: 'city',
  intensity: 1
})
</script>

<style scoped>
.test-viewer {
  width: 100%;
  height: 100%;
  background: #f0f0f0;
  border: 2px solid #007bff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.test-content {
  text-align: center;
  padding: 2rem;
}

.test-canvas {
  width: 300px;
  height: 200px;
  background: #333;
  border-radius: 8px;
  margin: 1rem auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-placeholder {
  color: white;
  font-size: 14px;
}
</style>
