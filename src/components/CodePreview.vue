<template>
  <div class="code-preview">
    <div class="code-header">
      <div class="language-indicator">
        <span class="language-badge">{{ language }}</span>
        <span class="file-name">{{ fileName }}</span>
      </div>
      <div class="code-actions">
        <button 
          @click="toggleWrap"
          class="action-btn"
          :class="{ active: wrapLines }"
          title="Toggle word wrap"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4,10V12H18V10M4,6V8H18V6M4,14V16H18V14M4,18V20H18V18Z" />
          </svg>
        </button>
        <button 
          @click="copyCode"
          class="action-btn"
          :class="{ success: copied }"
          title="Copy code"
        >
          <svg v-if="!copied" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
          </svg>
        </button>
        <button 
          @click="downloadCode"
          class="action-btn"
          title="Download as file"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
          </svg>
        </button>
      </div>
    </div>
    
    <div 
      class="code-container"
      :class="{ 'wrap-lines': wrapLines }"
    >
      <pre><code 
        ref="codeElement"
        class="code-content"
        v-html="highlightedCode"
      ></code></pre>
      
      <!-- Line numbers -->
      <div v-if="showLineNumbers" class="line-numbers">
        <div 
          v-for="n in lineCount" 
          :key="n"
          class="line-number"
        >
          {{ n }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface Props {
  code: string
  language?: string
  fileName?: string
  showLineNumbers?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  code: '',
  language: 'vue',
  fileName: 'Component.vue',
  showLineNumbers: true
})

// State
const codeElement = ref<HTMLElement>()
const copied = ref(false)
const wrapLines = ref(false)

// Computed
const lineCount = computed(() => {
  return props.code.split('\n').length
})

const highlightedCode = computed(() => {
  return highlightSyntax(props.code, props.language)
})

// Methods
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
  const blob = new Blob([props.code], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = props.fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

function toggleWrap() {
  wrapLines.value = !wrapLines.value
}

// Simple syntax highlighting for Vue/JavaScript/TypeScript
function highlightSyntax(code: string, language: string): string {
  if (!code) return ''
  
  // Escape HTML first
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  
  let highlighted = escaped
  
  if (language === 'vue') {
    // Vue template highlighting
    highlighted = highlighted
      // Template tags
      .replace(/(&lt;template[^&]*&gt;)/g, '<span class="vue-template">$1</span>')
      .replace(/(&lt;\/template&gt;)/g, '<span class="vue-template">$1</span>')
      // Script tags
      .replace(/(&lt;script[^&]*&gt;)/g, '<span class="vue-script">$1</span>')
      .replace(/(&lt;\/script&gt;)/g, '<span class="vue-script">$1</span>')
      // Style tags
      .replace(/(&lt;style[^&]*&gt;)/g, '<span class="vue-style">$1</span>')
      .replace(/(&lt;\/style&gt;)/g, '<span class="vue-style">$1</span>')
      // Vue directives
      .replace(/\s(v-[a-zA-Z-]+(?::[a-zA-Z-]+)?)/g, ' <span class="vue-directive">$1</span>')
      .replace(/\s(@[a-zA-Z-]+)/g, ' <span class="vue-directive">$1</span>')
      .replace(/\s(:[a-zA-Z-]+)/g, ' <span class="vue-directive">$1</span>')
      // Component tags
      .replace(/(&lt;[A-Z][a-zA-Z]*)/g, '<span class="vue-component">$1</span>')
      .replace(/(&lt;\/[A-Z][a-zA-Z]*&gt;)/g, '<span class="vue-component">$1</span>')
  }
  
  // Common highlighting for JavaScript/TypeScript content
  highlighted = highlighted
    // Keywords
    .replace(/\b(import|export|from|default|const|let|var|function|class|interface|type|async|await|return|if|else|for|while|try|catch|finally|throw|new|this|super|extends|implements)\b/g, '<span class="keyword">$1</span>')
    // Strings
    .replace(/(&#39;[^&#39;]*&#39;|&quot;[^&quot;]*&quot;|`[^`]*`)/g, '<span class="string">$1</span>')
    // Comments
    .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="comment">$1</span>')
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>')
    // Functions
    .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span class="function">$1</span>')
    // Properties
    .replace(/\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g, '.<span class="property">$1</span>')
  
  return highlighted
}

// Watch for code changes and scroll to top
watch(() => props.code, () => {
  nextTick(() => {
    if (codeElement.value) {
      codeElement.value.parentElement?.scrollTo(0, 0)
    }
  })
})
</script>

<style scoped>
.code-preview {
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #fff;
  border-bottom: 1px solid #e1e5e9;
}

.language-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.language-badge {
  background: #667eea;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.file-name {
  font-size: 0.9rem;
  color: #495057;
  font-weight: 500;
}

.code-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: 1px solid #dee2e6;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  color: #6c757d;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: #f8f9fa;
  color: #495057;
}

.action-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.action-btn.success {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.code-container {
  position: relative;
  height: 100%;
  min-height: 400px;
  max-height: calc(100vh - 200px);
  overflow: auto;
  background: #282c34;
}

.code-container.wrap-lines .code-content {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.code-content {
  display: block;
  padding: 1rem;
  padding-left: 3.5rem;
  margin: 0;
  color: #abb2bf;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre;
  overflow-x: auto;
  background: transparent;
}

.line-numbers {
  position: absolute;
  top: 0;
  left: 0;
  padding: 1rem 0.5rem;
  background: rgba(40, 44, 52, 0.8);
  border-right: 1px solid #3e4451;
  user-select: none;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #5c6370;
  width: 3rem;
  text-align: right;
}

.line-number {
  height: 1.3125rem; /* 21px to match line-height */
}

/* Syntax highlighting styles */
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

/* Scrollbar styling */
.code-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.code-container::-webkit-scrollbar-track {
  background: #282c34;
}

.code-container::-webkit-scrollbar-thumb {
  background: #5c6370;
  border-radius: 4px;
}

.code-container::-webkit-scrollbar-thumb:hover {
  background: #abb2bf;
}

@media (max-width: 768px) {
  .code-header {
    padding: 0.5rem;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
  
  .language-indicator {
    gap: 0.5rem;
  }
  
  .code-content {
    padding: 0.75rem;
    padding-left: 2.5rem;
    font-size: 0.8rem;
  }
  
  .line-numbers {
    width: 2.25rem;
    padding: 0.75rem 0.25rem;
    font-size: 0.8rem;
  }
}
</style>