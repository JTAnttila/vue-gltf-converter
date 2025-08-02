<template>
  <div id="app">
    <GltfToolLayout />
  </div>
</template>

<script setup lang="ts">
import GltfToolLayout from './components/GltfToolLayout.vue'
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

#app {
  height: 100vh;
}

/* Global button styles */
button {
  font-family: inherit;
}

/* Global form styles */
input, select, textarea {
  font-family: inherit;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Code syntax highlighting (basic) */
.code-display code {
  color: #333;
}

.code-display .keyword {
  color: #0066cc;
  font-weight: bold;
}

.code-display .string {
  color: #008800;
}

.code-display .comment {
  color: #888;
  font-style: italic;
}

.code-display .number {
  color: #cc6600;
}
</style>