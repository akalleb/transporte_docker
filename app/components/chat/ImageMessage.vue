<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ClockIcon, AlertCircleIcon } from 'lucide-vue-next'

const props = defineProps<{
  src: string
  alt?: string
}>()

const supabase = useSupabaseClient()
const thumbnailUrl = ref('')
const fullSizeUrl = ref('')
const isLoading = ref(true)
const error = ref(false)

const loadImage = async () => {
  if (!props.src) return
  
  isLoading.value = true
  error.value = false

  try {
    // Se já for uma URL completa (http/https), usa direto
    if (props.src.startsWith('http')) {
      thumbnailUrl.value = props.src
      fullSizeUrl.value = props.src
    } 
    else {
        let path = props.src
        if (props.src.includes('requisicoes/')) {
            path = props.src.split('requisicoes/')[1]
        }

        // Thumbnail (otimizado)
        const { data: thumbData, error: thumbError } = await supabase.storage
            .from('requisicoes')
            .createSignedUrl(path, 3600, {
                transform: {
                    width: 300,
                    quality: 80
                }
            })
            
        // Tamanho original (ao clicar)
        const { data: fullData, error: fullError } = await supabase.storage
            .from('requisicoes')
            .createSignedUrl(path, 3600)
        
        if (thumbError || fullError) throw (thumbError || fullError)
        
        thumbnailUrl.value = thumbData?.signedUrl || ''
        fullSizeUrl.value = fullData?.signedUrl || ''
    }
  } catch (e) {
    console.error('Erro ao carregar imagem:', e)
    error.value = true
  } finally {
    isLoading.value = false
  }
}

onMounted(loadImage)
watch(() => props.src, loadImage)
</script>

<template>
  <div class="rounded-lg overflow-hidden max-w-xs sm:max-w-sm">
    <div v-if="isLoading" class="flex items-center justify-center h-48 bg-slate-100 dark:bg-slate-800 animate-pulse">
        <ClockIcon class="w-6 h-6 text-slate-400 animate-spin" />
    </div>
    
    <div v-else-if="error" class="flex items-center justify-center h-32 bg-red-50 dark:bg-red-900/20 text-red-500 p-4 text-center text-xs">
        <AlertCircleIcon class="w-5 h-5 mb-1 mx-auto" />
        Erro ao carregar imagem
    </div>

    <a v-else :href="fullSizeUrl" target="_blank" class="block relative group cursor-pointer">
        <img 
            :src="thumbnailUrl" 
            :alt="alt || 'Imagem enviada'" 
            class="w-full h-auto object-cover rounded-lg shadow-sm hover:opacity-95 transition-opacity"
            loading="lazy"
        />
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
             <span class="text-white text-xs bg-black/50 px-2 py-1 rounded">Clique para ampliar</span>
        </div>
    </a>
  </div>
</template>
