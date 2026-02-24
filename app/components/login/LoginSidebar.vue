<template>
  <div class="relative hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-24 overflow-hidden bg-slate-900">
    <div class="absolute inset-0 z-0">
      <img 
        alt="Gestão de Atendimento" 
        class="h-full w-full object-cover opacity-40" 
        src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
      />
      <div class="absolute inset-0 bg-primary/80 mix-blend-multiply"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-background-dark/90 to-transparent"></div>
    </div>

    <div class="relative z-10">
      <div class="flex items-center gap-3 mb-8">
        <div class="bg-white p-2 rounded-lg shadow-lg">
          <MessageCircleIcon class="text-primary w-8 h-8" />
        </div>
        <span class="text-white text-xl font-bold tracking-tight">MultiChat</span>
      </div>

      <h1 class="text-white text-5xl xl:text-6xl font-extrabold leading-tight mb-6">
        Central de <br />
        Multi-Atendimento
      </h1>

      <p class="text-white/90 text-lg max-w-md font-light leading-relaxed">
        Gerencie múltiplos canais de WhatsApp em uma interface unificada, minimalista e eficiente.
      </p>

      <div class="mt-12 flex gap-6">
        <div class="flex items-center gap-2 text-white/90 text-sm font-medium">
          <CheckCircleIcon class="text-white w-5 h-5" />
          <span>Múltiplos Canais</span>
        </div>
        <div class="flex items-center gap-2 text-white/90 text-sm font-medium">
          <CheckCircleIcon class="text-white w-5 h-5" />
          <span>Relatórios em Tempo Real</span>
        </div>
      </div>
    </div>

    <div class="absolute bottom-8 left-12 xl:left-24 z-10 text-white/60 text-xs">
      © 2026 MultiChat. Todos os direitos reservados.
    </div>
  </div>
</template>

<script setup>
import { MessageCircleIcon, CheckCircleIcon } from 'lucide-vue-next'
</script>
