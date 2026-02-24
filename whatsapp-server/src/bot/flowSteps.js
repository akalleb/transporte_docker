// Definição dos passos do fluxo de atendimento
const flowSteps = {
  start: {
    message: "Olá! 👋 Sou o assistente virtual do Transporte da Saúde.\nVou te ajudar a marcar sua viagem de forma rápida e fácil.\n\nPara começar, digite seu *nome completo*:",
    saveField: "patient_name",
    next: "ask_phone",
    type: "text"
  },

  ask_phone: {
    message: "Agora, digite seu número de telefone (com DDD) para a gente entrar em contato:",
    saveField: "patient_phone",
    next: "procedure_type",
    type: "text"
  },

  // Removido patient_name daqui pois foi para o início

  procedure_type: {
    message: "O transporte é para qual finalidade?\n\n1️⃣ Consulta\n2️⃣ Exame\n\nDigite apenas o número da opção.",
    options: {
      "1": "Consulta",
      "2": "Exame",
      "consulta": "Consulta",
      "exame": "Exame"
    },
    saveField: "procedure_type",
    next: "procedure_name",
    type: "option"
  },

  procedure_name: {
    message: "Qual o nome da especialidade ou do exame?\n(Ex: Cardiologista, Raio-X)",
    saveField: "procedure_name",
    next: "procedure_date",
    type: "text"
  },

  procedure_date: {
    message: "📅 Para qual *data* você precisa do transporte? (Ex: 25/10 ou Amanhã)",
    type: 'input',
    saveField: 'procedure_date',
    validation: (input) => {
      // Aceita formatos: DD/MM, DD/MM/AAAA, Amanhã, Hoje
      const lower = input.toLowerCase().trim()
      const today = new Date()
      let targetDate = null

      if (lower === 'hoje') {
        targetDate = today
      } else if (lower === 'amanhã' || lower === 'amanha') {
        targetDate = new Date(today)
        targetDate.setDate(today.getDate() + 1)
      } else {
        // Tenta parsear data DD/MM
        const parts = lower.split('/')
        if (parts.length >= 2) {
          const day = parseInt(parts[0])
          const month = parseInt(parts[1]) - 1 // JS months are 0-indexed
          const year = parts.length === 3 ? parseInt(parts[2]) : today.getFullYear()
          
          // Ajuste básico para ano se user digitar data passada (assume próximo ano)
          let finalYear = year
          if (parts.length === 2) {
             const tempDate = new Date(year, month, day)
             if (tempDate < today && (today.getTime() - tempDate.getTime() > 86400000)) {
                 finalYear++
             }
          }
          
          targetDate = new Date(finalYear, month, day)
        }
      }

      if (targetDate && !isNaN(targetDate.getTime())) {
          // 4B: Validar fim de semana
          const dayOfWeek = targetDate.getDay() // 0=Dom, 6=Sab
          if (dayOfWeek === 0 || dayOfWeek === 6) {
              return { error: '❌ Não realizamos viagens aos finais de semana. Por favor, escolha uma data de segunda a sexta.' }
          }
          
          // Formatar para salvar: YYYY-MM-DD
          const yyyy = targetDate.getFullYear()
          const mm = String(targetDate.getMonth() + 1).padStart(2, '0')
          const dd = String(targetDate.getDate()).padStart(2, '0')
          return { value: `${yyyy}-${mm}-${dd}` }
      }

      return { error: '❌ Data inválida. Por favor, digite no formato Dia/Mês (Ex: 25/10) ou escreva "Amanhã".' }
    },
    next: 'procedure_time'
  },
  
  procedure_time: {
    message: "⏰ Qual o *horário* do procedimento/consulta? (Ex: 08:30 ou 14h)",
    type: 'input',
    saveField: 'procedure_time',
    validation: (input) => {
       // 4C: Normalizar horário
       // Aceitar: "9h", "9:00", "09:00", "9h30", "9:30", "14h", "14:00" 
       const clean = input.toLowerCase().replace(/\s/g, '') 
       let normalizedTime = null
       
       // "9h" → "09:00", "9h30" → "09:30", "14h" → "14:00" 
       const match = clean.match(/^(\d{1,2})h(\d{2})?$/) 
       if (match) {
           normalizedTime = `${match[1].padStart(2,'0')}:${match[2] || '00'}` 
       } else {
           // "9:00" → "09:00" 
           const match2 = clean.match(/^(\d{1,2}):(\d{2})$/) 
           if (match2) {
               normalizedTime = `${match2[1].padStart(2,'0')}:${match2[2]}`
           }
       }

       if (normalizedTime) {
           // Validar hora válida (00-23, 00-59)
           const [h, m] = normalizedTime.split(':').map(Number)
           if (h >= 0 && h < 24 && m >= 0 && m < 60) {
               return { value: normalizedTime }
           }
       }
       
       return { error: '❌ Horário inválido. Use o formato HH:MM ou HHh (Ex: 08:30, 14h).' }
    },
    next: 'location'
  },

  location: {
    message: "Qual o nome do local (Hospital ou Clínica) onde você vai?",
    saveField: "location",
    next: "city",
    type: "text"
  },

  city: {
    message: "Em qual cidade fica esse local?",
    saveField: "city",
    next: "boarding_neighborhood",
    type: "text"
  },

  boarding_neighborhood: {
    message: "Escolha seu bairro de embarque na lista abaixo:\n(Digite o número correspondente)",
    saveField: "boarding_neighborhood",
    next: "boarding_point",
    type: "dynamic_option",
    source: "neighborhoods"
  },

  boarding_point: {
    message: "Qual o ponto de embarque?\n(Digite o número)",
    saveField: "boarding_point",
    next: "check_companion",
    type: "dynamic_option",
    source: "points"
  },

  check_companion: {
    message: "Você precisa de acompanhante?\n\n1️⃣ Sim\n2️⃣ Não",
    options: {
      "1": true,
      "2": false,
      "sim": true,
      "s": true,
      "não": false,
      "nao": false,
      "n": false
    },
    saveField: "needs_companion",
    next: {
      "true": "companion_reason",
      "false": "docs_upload",
      "default": "companion_reason"
    },
    type: "option"
  },

  companion_reason: {
    message: "Qual o motivo do acompanhante?\n\n1️⃣ Idoso\n2️⃣ Declaração médica\n3️⃣ Criança\n4️⃣ Cadeirante\n5️⃣ Paciente para cirurgia",
    options: {
      "1": "Idoso",
      "2": "Declaração médica",
      "3": "Criança",
      "4": "Cadeirante",
      "5": "Paciente para cirurgia",
      "idoso": "Idoso",
      "criança": "Criança",
      "crianca": "Criança",
      "cadeirante": "Cadeirante",
      "cirurgia": "Paciente para cirurgia"
    },
    saveField: "companion_reason",
    next: "docs_upload",
    type: "option"
  },

  docs_upload: {
    message: "Para finalizar, envie uma *foto* do seu comprovante de agendamento ou encaminhamento médico.\n(Se não tiver agora, digite 'pular')",
    saveField: "attachment_url",
    next: "finish",
    type: "media"
  },

  finish: {
    message: "✅ *Tudo certo!*\n\nRecebemos seu pedido e vamos analisar.\n\n⚠️ *Importante:* Se precisar mudar o horário ou qualquer informação antes da confirmação, é só mandar uma mensagem aqui no chat que a gente ajusta para você.",
    action: "complete_registration",
    next: "completed",
    type: "info"
  },

  completed: {
    // Estado final silencioso
    type: "info"
  }
}

export default flowSteps
