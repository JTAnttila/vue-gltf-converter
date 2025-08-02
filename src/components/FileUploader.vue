<template>
  <div class="file-uploader">
    <div 
      class="drop-zone"
      :class="{ 
        'drag-over': isDragOver,
        'has-files': hasFiles,
        'uploading': isUploading 
      }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        accept=".gltf,.glb,.zip,.bin,.jpg,.jpeg,.png,.webp,.hdr,.exr"
        @change="handleFileInput"
        style="display: none"
      />
      
      <div class="drop-content">
        <div v-if="isUploading" class="uploading-state">
          <div class="spinner"></div>
          <h3>Processing files...</h3>
          <p>Please wait while we process your GLTF model</p>
        </div>
        
        <div v-else-if="hasFiles" class="files-preview">
          <div class="file-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          <h3>{{ mainFileName }}</h3>
          <p>{{ fileCount }} file{{ fileCount > 1 ? 's' : '' }} ready</p>
          <div class="file-list">
            <div 
              v-for="file in fileList.slice(0, 5)" 
              :key="file.name"
              class="file-item"
            >
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
            </div>
            <div v-if="fileList.length > 5" class="more-files">
              +{{ fileList.length - 5 }} more files
            </div>
          </div>
          <button @click.stop="clearFiles" class="clear-btn">
            Clear Files
          </button>
        </div>
        
        <div v-else class="upload-prompt">
          <div class="upload-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          <h3>Drop your GLTF files here</h3>
          <p>Or click to browse files</p>
          <div class="supported-formats">
            <span class="format-badge">.gltf</span>
            <span class="format-badge">.glb</span>
            <span class="format-badge">.zip</span>
            <span class="format-badge">+textures</span>
          </div>
          <div class="upload-tips">
            <p>💡 <strong>Tips:</strong></p>
            <ul>
              <li>Upload .gltf with textures, or .glb files</li>
              <li>Include texture files (.jpg, .png, .webp, .hdr)</li>
              <li>Support for .bin geometry files</li>
              <li>Zip files containing multiple assets are supported</li>
              <li>Files will be converted to TresJS components</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="clearError" class="close-error">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import JSZip from 'jszip'

interface FileData {
  name: string
  size: number
  buffer: ArrayBuffer
}

interface ZipResult {
  type: 'zip'
  file: File
  zipData: Map<string, ArrayBuffer>
  buffer: ArrayBuffer
}

interface IndividualResult {
  type: 'individual'
  file: File
  buffer: ArrayBuffer
}

type FileProcessingResult = ZipResult | IndividualResult

const emit = defineEmits<{
  filesUploaded: [{ buffers: Map<string, ArrayBuffer>, fileName: string }]
}>()

// State
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const isUploading = ref(false)
const fileList = ref<FileData[]>([])
const error = ref<string | null>(null)

// Computed
const hasFiles = computed(() => fileList.value.length > 0)
const fileCount = computed(() => fileList.value.length)
const mainFileName = computed(() => {
  const gltfFile = fileList.value.find(f => 
    f.name.toLowerCase().endsWith('.gltf') || f.name.toLowerCase().endsWith('.glb')
  )
  return gltfFile?.name || fileList.value[0]?.name || ''
})

// Methods
function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  
  const files: File[] = []
  
  if (event.dataTransfer?.files) {
    // Handle regular files
    files.push(...Array.from(event.dataTransfer.files))
  }
  
  if (event.dataTransfer?.items) {
    // Handle directory drops and other items
    for (const item of Array.from(event.dataTransfer.items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && !files.some(f => f.name === file.name)) {
          files.push(file)
        }
      }
    }
  }
  
  console.log('Dropped files:', files.map(f => ({ 
    name: f.name, 
    size: f.size, 
    type: f.type,
    lastModified: f.lastModified 
  })))
  
  if (files.length > 0) {
    processFiles(files)
  } else {
    error.value = 'No valid files were dropped. Please drop .gltf, .glb, or .zip files.'
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
}

function handleDragEnter(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function handleDragLeave(event: DragEvent) {
  if (!event.relatedTarget || !(event.currentTarget as Element).contains(event.relatedTarget as Node)) {
    isDragOver.value = false
  }
}

function triggerFileInput() {
  if (!isUploading.value) {
    fileInput.value?.click()
  }
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  
  // Clear the input value to allow re-uploading the same files
  input.value = ''
  
  if (files.length > 0) {
    console.log('Files selected:', files.map(f => ({ name: f.name, size: f.size, type: f.type })))
    processFiles(files)
  }
}

// Validation helper
function validateFiles(files: File[]): { valid: boolean; error?: string } {
  if (files.length === 0) {
    return { valid: false, error: 'No files selected' }
  }
  
  // Check if we have at least one main file (GLTF, GLB, or ZIP)
  const hasMainFile = files.some(file => {
    const name = file.name.toLowerCase()
    return name.endsWith('.gltf') || name.endsWith('.glb') || name.endsWith('.zip')
  })
  
  if (!hasMainFile) {
    return { 
      valid: false, 
      error: 'Please include at least one .gltf, .glb, or .zip file' 
    }
  }
  
  // Check file sizes (max 100MB per file)
  const maxSize = 100 * 1024 * 1024 // 100MB
  const oversizedFiles = files.filter(file => file.size > maxSize)
  
  if (oversizedFiles.length > 0) {
    return { 
      valid: false, 
      error: `Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Max size: 100MB` 
    }
  }
  
  return { valid: true }
}

async function processFiles(files: File[]) {
  if (files.length === 0) return
  
  // Validate files first
  const validation = validateFiles(files)
  if (!validation.valid) {
    error.value = validation.error || 'Invalid files'
    return
  }
  
  try {
    isUploading.value = true
    error.value = null
    
    console.log('Starting to process files:', files.map(f => f.name))
    
    const buffers = new Map<string, ArrayBuffer>()
    const processedFiles: FileData[] = []
    let mainFileName = ''
    
    // Process files concurrently for better performance
    const fileProcessingPromises = Array.from(files).map(async (file, index): Promise<FileProcessingResult> => {
      try {
        console.log(`Processing file ${index + 1}/${files.length}: ${file.name}`)
        const buffer = await file.arrayBuffer()
        
        if (file.name.toLowerCase().endsWith('.zip')) {
          // Handle ZIP files
          const zipData = await processZipFile(buffer)
          return { type: 'zip', file, zipData, buffer }
        } else {
          // Handle individual files
          return { type: 'individual', file, buffer }
        }
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err)
        throw new Error(`Failed to process file: ${file.name} - ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    })
    
    const results = await Promise.all(fileProcessingPromises)
    
    // Process results
    for (const result of results) {
      if (result.type === 'zip' && result.zipData) {
        // Handle ZIP files
        result.zipData.forEach((zipBuffer, zipPath) => {
          buffers.set(zipPath, zipBuffer)
          processedFiles.push({
            name: zipPath,
            size: zipBuffer.byteLength,
            buffer: zipBuffer
          })
        })
        
        // Find main GLTF file in ZIP
        const gltfEntry = Array.from(result.zipData.keys()).find(path => 
          path.toLowerCase().endsWith('.gltf') || path.toLowerCase().endsWith('.glb')
        )
        if (gltfEntry && !mainFileName) {
          mainFileName = gltfEntry
        }
      } else {
        // Handle individual files
        const fileName = result.file.name
        buffers.set(fileName, result.buffer)
        processedFiles.push({
          name: fileName,
          size: result.file.size,
          buffer: result.buffer
        })
        
        if ((fileName.toLowerCase().endsWith('.gltf') || fileName.toLowerCase().endsWith('.glb')) && !mainFileName) {
          mainFileName = fileName
        }
      }
    }
    
    // Validation
    if (!mainFileName) {
      throw new Error('No GLTF or GLB file found. Please upload at least one .gltf or .glb file.')
    }
    
    const hasGltfFile = Array.from(buffers.keys()).some(name => 
      name.toLowerCase().endsWith('.gltf') || name.toLowerCase().endsWith('.glb')
    )
    
    if (!hasGltfFile) {
      throw new Error('Please upload at least one GLTF (.gltf) or GLB (.glb) file')
    }
    
    // Success - update state
    fileList.value = processedFiles
    
    console.log('Files processed successfully:', {
      mainFile: mainFileName,
      totalFiles: buffers.size,
      files: Array.from(buffers.keys())
    })
    
    // Emit the processed files
    emit('filesUploaded', { buffers, fileName: mainFileName })
    
  } catch (err) {
    console.error('Error processing files:', err)
    error.value = err instanceof Error ? err.message : 'Failed to process files'
    fileList.value = []
  } finally {
    isUploading.value = false
  }
}

async function processZipFile(buffer: ArrayBuffer): Promise<Map<string, ArrayBuffer>> {
  try {
    const zip = new JSZip()
    const zipData = await zip.loadAsync(buffer)
    const result = new Map<string, ArrayBuffer>()
    
    console.log('Processing ZIP file with entries:', Object.keys(zipData.files))
    
    const filePromises: Promise<void>[] = []
    
    for (const [path, file] of Object.entries(zipData.files)) {
      if (!file.dir && path && !path.startsWith('__MACOSX/') && !path.startsWith('.')) {
        const promise = (async () => {
          try {
            const fileBuffer = await file.async('arraybuffer')
            // Normalize path separators and remove leading slashes
            const normalizedPath = path.replace(/\\/g, '/').replace(/^\/+/, '')
            result.set(normalizedPath, fileBuffer)
            console.log(`Extracted: ${normalizedPath} (${fileBuffer.byteLength} bytes)`)
          } catch (err) {
            console.error(`Failed to extract ${path}:`, err)
            throw new Error(`Failed to extract file from ZIP: ${path}`)
          }
        })()
        filePromises.push(promise)
      }
    }
    
    await Promise.all(filePromises)
    
    if (result.size === 0) {
      throw new Error('ZIP file contains no valid files')
    }
    
    return result
  } catch (err) {
    console.error('Error processing ZIP file:', err)
    throw new Error(`Failed to process ZIP file: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function clearFiles() {
  fileList.value = []
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function clearError() {
  error.value = null
}
</script>

<style scoped>
.file-uploader {
  width: 100%;
  max-width: 600px;
}

.drop-zone {
  border: 3px dashed #ccc;
  border-radius: 16px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-zone:hover {
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.1);
}

.drop-zone.drag-over {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  transform: scale(1.02);
}

.drop-zone.has-files {
  border-color: #28a745;
  background: rgba(40, 167, 69, 0.1);
}

.drop-zone.uploading {
  border-color: #ffc107;
  background: rgba(255, 193, 7, 0.1);
  cursor: wait;
}

.drop-content {
  width: 100%;
}

.upload-icon,
.file-icon {
  margin-bottom: 1rem;
  color: #667eea;
}

.uploading-state {
  color: #ffc107;
}

.files-preview {
  color: #28a745;
}

.upload-prompt h3,
.files-preview h3,
.uploading-state h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.upload-prompt p,
.files-preview p,
.uploading-state p {
  margin: 0 0 1.5rem 0;
  color: #666;
  font-size: 1.1rem;
}

.supported-formats {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.format-badge {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.upload-tips {
  text-align: left;
  background: rgba(255, 255, 255, 0.5);
  padding: 1.5rem;
  border-radius: 12px;
  margin-top: 2rem;
}

.upload-tips p {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: #333;
}

.upload-tips ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #555;
}

.upload-tips li {
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.file-list {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  max-height: 200px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.file-item:last-child {
  border-bottom: none;
}

.file-name {
  font-weight: 500;
  color: #333;
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 1rem;
}

.file-size {
  color: #666;
  font-size: 0.9rem;
}

.more-files {
  padding: 0.5rem 0;
  color: #666;
  font-style: italic;
  text-align: center;
}

.clear-btn {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  border: 1px solid rgba(220, 53, 69, 0.3);
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;
}

.clear-btn:hover {
  background: rgba(220, 53, 69, 0.2);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 193, 7, 0.3);
  border-top: 4px solid #ffc107;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: #ff6b6b;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message p {
  margin: 0;
  font-size: 0.9rem;
}

.close-error {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .drop-zone {
    padding: 2rem 1rem;
    min-height: 300px;
  }
  
  .upload-prompt h3,
  .files-preview h3,
  .uploading-state h3 {
    font-size: 1.25rem;
  }
  
  .supported-formats {
    flex-wrap: wrap;
  }
  
  .upload-tips {
    padding: 1rem;
  }
}
</style>