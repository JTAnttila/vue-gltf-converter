<template>
  <div class="code-viewer-container">
    <div class="code-header">
      <div class="file-info">
        <span class="language-badge">{{ language }}</span>
        <span class="file-name">{{ fileName || 'Generated Component' }}</span>
      </div>
      <div class="code-actions">
        <button 
          @click="toggleWrap"
          class="action-btn"
          :class="{ active: wrapLines }"
          title="Toggle word wrap"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4,6H20V8H4V6M4,10V12H20V10M4,14V16H20V14M4,18V20H18V18Z" />
          </svg>
        </button>
        <button 
          @click="copyCode"
          class="action-btn"
          :class="{ success: copied }"
          title="Copy code"
        >
          <svg v-if="!copied" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
          </svg>
        </button>
        <button 
          @click="downloadCode"
          class="action-btn"
          title="Download as file"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
          </svg>
        </button>
      </div>
    </div>
    
    <div class="code-viewport" ref="codeViewport">
      <div class="code-scroll-container" :class="{ 'wrap-lines': wrapLines }">
        <!-- Line numbers -->
        <div v-if="showLineNumbers" class="line-numbers" ref="lineNumbers">
          <div 
            v-for="n in lineCount" 
            :key="n"
            class="line-number"
          >
            {{ n }}
          </div>
        </div>
        
        <!-- Code content -->
        <pre 
          class="code-content"
          ref="codeElement"
          @scroll="syncScroll"
        ><code v-html="highlightedCode"></code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'

interface Props {
  code: string
  language?: string
  fileName?: string
  showLineNumbers?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  code: '',
  language: 'vue',
  fileName: '',
  showLineNumbers: true
})

// Refs
const codeElement = ref<HTMLElement>()
const lineNumbers = ref<HTMLElement>()
const codeViewport = ref<HTMLElement>()

// State
const copied = ref(false)
const wrapLines = ref(false)

// Computed
const lineCount = computed(() => {
  return props.code ? props.code.split('\n').length : 0
})

const highlightedCode = computed(() => {
  if (!props.code) return ''
  return highlightSyntax(props.code, props.language)
})

// Methods
function highlightSyntax(code: string, language: string): string {
  // Escape HTML
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  // Vue-specific highlighting
  if (language === 'vue') {
    highlighted = highlighted
      // Template tags
      .replace(/(&lt;template[^&]*&gt;)([\s\S]*?)(&lt;\/template&gt;)/g, 
        '<span class="vue-template">$1</span>$2<span class="vue-template">$3</span>')
      .replace(/(&lt;script[^&]*&gt;)([\s\S]*?)(&lt;\/script&gt;)/g, 
        '<span class="vue-script">$1</span>$2<span class="vue-script">$3</span>')
      .replace(/(&lt;style[^&]*&gt;)([\s\S]*?)(&lt;\/style&gt;)/g, 
        '<span class="vue-style">$1</span>$2<span class="vue-style">$3</span>')
      // Vue directives
      .replace(/\s(v-[a-zA-Z-]+)/g, ' <span class="vue-directive">$1</span>')
      .replace(/\s(@[a-zA-Z-]+)/g, ' <span class="vue-directive">$1</span>')
      .replace(/\s(:[a-zA-Z-]+)/g, ' <span class="vue-directive">$1</span>')
      // Component tags
      .replace(/(&lt;[A-Z][a-zA-Z]*)/g, '<span class="vue-component">$1</span>')
      .replace(/(&lt;\/[A-Z][a-zA-Z]*&gt;)/g, '<span class="vue-component">$1</span>')
  }
  
  // Common syntax highlighting
  highlighted = highlighted
    // Keywords
    .replace(/\b(import|export|from|default|const|let|var|function|class|interface|type|async|await|return|if|else|for|while|try|catch|finally|throw|new|this|super|extends|implements)\b/g, 
      '<span class="keyword">$1</span>')
    // Strings
    .replace(/(&#39;[^&#39;]*&#39;|&quot;[^&quot;]*&quot;|`[^`]*`)/g, 
      '<span class="string">$1</span>')
    // Comments
    .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, 
      '<span class="comment">$1</span>')
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, 
      '<span class="number">$1</span>')
    // Functions
    .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, 
      '<span class="function">$1</span>')
    // Properties
    .replace(/\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g, 
      '.<span class="property">$1</span>')

  return highlighted
}

function toggleWrap() {
  wrapLines.value = !wrapLines.value
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy code:', error)
  }
}

function downloadCode() {
  const element = document.createElement('a')
  const file = new Blob([props.code], { type: 'text/plain' })
  element.href = URL.createObjectURL(file)
  element.download = props.fileName || 'component.vue'
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

function syncScroll() {
  if (lineNumbers.value && codeElement.value) {
    lineNumbers.value.scrollTop = codeElement.value.scrollTop
  }
}

// Watch for code changes and reset scroll
watch(() => props.code, () => {
  nextTick(() => {
    if (codeElement.value) {
      codeElement.value.scrollTop = 0
      codeElement.value.scrollLeft = 0
    }
    if (lineNumbers.value) {
      lineNumbers.value.scrollTop = 0
    }
  })
})

onMounted(() => {
  // Ensure proper scrolling setup
  nextTick(() => {
    syncScroll()
  })
})
</script>

<style scoped>
.code-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  overflow: hidden;
  background: #282c34;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #21252b;
  border-bottom: 1px solid #3e4451;
  flex-shrink: 0;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.language-badge {
  background: #667eea;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.file-name {
  font-size: 12px;
  color: #abb2bf;
  font-weight: 500;
}

.code-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: transparent;
  border: 1px solid #3e4451;
  padding: 4px 6px;
  border-radius: 3px;
  cursor: pointer;
  color: #abb2bf;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: rgba(171, 178, 191, 0.1);
  border-color: #abb2bf;
}

.action-btn.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.action-btn.success {
  background: #28a745;
  border-color: #28a745;
  color: white;
}

.code-viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.code-scroll-container {
  height: 100%;
  display: flex;
  position: relative;
}

.line-numbers {
  background: rgba(33, 37, 43, 0.9);
  border-right: 1px solid #3e4451;
  user-select: none;
  font-size: 11px;
  line-height: 1.5;
  color: #5c6370;
  width: 48px;
  text-align: right;
  padding: 12px 8px;
  flex-shrink: 0;
  overflow: hidden; /* Line numbers don't scroll horizontally */
}

.line-number {
  height: 16.5px; /* Match line height */
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.code-content {
  flex: 1;
  margin: 0;
  padding: 12px 16px;
  color: #abb2bf;
  font-size: 11px;
  line-height: 1.5;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  white-space: pre;
  overflow: auto; /* Only this element scrolls */
  min-height: 100%;
  font-family: inherit;
}

.code-content code {
  background: transparent;
  padding: 0;
  border: none;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.wrap-lines .code-content {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: hidden;
}

/* Syntax highlighting */
:deep(.keyword) {
  color: #c678dd;
  font-weight: 500;
}

:deep(.string) {
  color: #98c379;
}

:deep(.comment) {
  color: #5c6370;
  font-style: italic;
}

:deep(.number) {
  color: #d19a66;
}

:deep(.function) {
  color: #61afef;
}

:deep(.property) {
  color: #e06c75;
}

:deep(.vue-template) {
  color: #e06c75;
  font-weight: 500;
}

:deep(.vue-script) {
  color: #c678dd;
  font-weight: 500;
}

:deep(.vue-style) {
  color: #56b6c2;
  font-weight: 500;
}

:deep(.vue-directive) {
  color: #d19a66;
  font-weight: 500;
}

:deep(.vue-component) {
  color: #e5c07b;
  font-weight: 500;
}

/* Custom scrollbar */
.code-content::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.code-content::-webkit-scrollbar-track {
  background: #282c34;
}

.code-content::-webkit-scrollbar-thumb {
  background: #5c6370;
  border-radius: 6px;
  border: 2px solid #282c34;
}

.code-content::-webkit-scrollbar-thumb:hover {
  background: #abb2bf;
}

.code-content::-webkit-scrollbar-corner {
  background: #282c34;
}

/* Responsive */
@media (max-width: 768px) {
  .code-header {
    padding: 6px 8px;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }

  .file-info {
    gap: 6px;
  }

  .code-content {
    padding: 8px 12px;
    font-size: 10px;
  }

  .line-numbers {
    width: 36px;
    padding: 8px 6px;
    font-size: 10px;
  }

  .line-number {
    height: 15px;
  }
}
</style>