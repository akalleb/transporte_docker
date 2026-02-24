import axios from 'axios'
import flowSteps from './flowSteps.js'
import { extractDataWithAI, generateErrorExplanation } from './aiFallbackService.js'

// Simple helper to clean text
const cleanText = (text) => text?.trim() || ''

// Helper to validate date (DD/MM/YYYY or DD/MM) and return formatted YYYY-MM-DD
const parseDate = (text) => {
  const dateRegex = /^(\d{1,2})[\/\-\.](\d{1,2})([\/\-\.]\d{2,4})?$/
  const match = text.match(dateRegex)
  
  if (!match) return null
  
  let day = match[1].padStart(2, '0')
  let month = match[2].padStart(2, '0')
  let year = match[3] ? match[3].replace(/[\/\-\.]/, '') : null
  
  const currentYear = new Date().getFullYear()
  
  if (!year) {
    year = currentYear
    // Se a data já passou neste ano, assume próximo ano? (Opcional, por enquanto mantém ano atual)
  } else if (year.length === 2) {
    year = '20' + year
  }
  
  return `${year}-${month}-${day}`
}

// Helper to validate time (HH:MM)
const isValidTime = (text) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(text)
}

// Main processor function
export async function processStep(stepKey, messageContent, conversation, supabase) {
  const stepConfig = flowSteps[stepKey]
  
  if (!stepConfig) {
    return { error: 'Passo não encontrado', nextStep: 'start' }
  }

  // Se o passo for apenas informativo (ex: start), não processa input, só retorna a mensagem do próximo
  if (stepConfig.type === 'info') {
    return { 
      nextStep: stepConfig.next,
      dataToSave: {} 
    }
  }

  let value = cleanText(messageContent)
  let nextStep = stepConfig.next
  let dataToSave = {}

  // 1. Executar validação customizada se houver (prioridade sobre tipos padrão)
  if (stepConfig.validation && typeof stepConfig.validation === 'function') {
      const validationResult = stepConfig.validation(value)
      if (validationResult.error) {
          return {
              error: validationResult.error,
              repeatStep: true
          }
      }
      // Se a validação retornar um valor transformado, usa ele
      if (validationResult.value !== undefined) {
          value = validationResult.value
      }
  }

  // Validação por tipo
  switch (stepConfig.type) {
    case 'option':
      // Tenta mapear a opção (1, 2, sim, não, etc)
      const normalizedValue = value.toLowerCase()
      let mappedValue = stepConfig.options[normalizedValue]
      
      // Tenta encontrar nos valores (ex: usuário digita "Exame" em vez de "2")
      if (mappedValue === undefined) {
          const foundValue = Object.values(stepConfig.options).find(v => 
              String(v).toLowerCase() === normalizedValue
          )
          if (foundValue !== undefined) mappedValue = foundValue
      }

      if (mappedValue === undefined) {
        // Fallback IA para opções complexas
        console.log('Tentando extrair opção com IA...')
        const aiResult = await extractDataWithAI(value, `Escolha uma opção entre: ${Object.keys(stepConfig.options).join(', ')}`)
        
        if (aiResult && aiResult.value) {
            // Tentar mapear o retorno da IA
            const aiNormalized = aiResult.value.toLowerCase()
            mappedValue = stepConfig.options[aiNormalized]
            // Se IA retornou o valor direto (ex: "Consulta")
            if (mappedValue === undefined) {
                 const aiFoundValue = Object.values(stepConfig.options).find(v => 
                    String(v).toLowerCase() === aiNormalized
                )
                if (aiFoundValue !== undefined) mappedValue = aiFoundValue
            }
        }
      }

      if (mappedValue === undefined) {
        const explanation = await generateErrorExplanation(
          value,
          `Opções disponíveis: ${Object.values(stepConfig.options).join(', ')}`,
          'Opção inválida'
        )
        return { 
          error: explanation || 'Opção inválida. Por favor, escolha uma das opções acima.',
          repeatStep: true 
        }
      }
      // Salva valor mapeado e retorna para o controller decidir
      if (stepConfig.saveField) {
        dataToSave[stepConfig.saveField] = mappedValue
      } else if (typeof mappedValue === 'object' && mappedValue !== null) {
        // Se não tem saveField mas o valor mapeado é um objeto, 
        // espalha as propriedades no dataToSave (ex: { needs_companion: true, reason: 'Idoso' })
        Object.assign(dataToSave, mappedValue)
      }

      return { 
        nextStep: null, // Deixa o Controller decidir baseado no config
        mappedValue: mappedValue,
        dataToSave
      }

    case 'dynamic_option':
      // Verifica se temos opções temporárias salvas no flow_data
      const tempOptions = conversation.flow_data?._temp_options || {}
      
      const normalizedInput = value.toLowerCase()
      let selectedValue = tempOptions[normalizedInput] // Tenta pelo número (chave)

      // Se não achou pelo número, tenta pelo valor (texto)
      if (!selectedValue) {
          const foundKey = Object.keys(tempOptions).find(key => 
              tempOptions[key].toLowerCase() === normalizedInput
          )
          if (foundKey) selectedValue = tempOptions[foundKey]
      }

      // Se não achou nas opções, mas o mapa estava vazio, aceita como texto livre (fallback)
      // Ou se o usuário digitou algo que não está na lista, decidimos se aceitamos ou não.
      // O requisito diz "apresentar opções", mas não proíbe outros. 
      // Mas geralmente menu numerado exige escolha válida.
      // Vamos ser estritos se houver opções. Se não houver, aceita texto.
      
      if (!selectedValue && Object.keys(tempOptions).length > 0) {
          // Fallback IA
          console.log('Tentando extrair opção dinâmica com IA...')
          const aiResult = await extractDataWithAI(value, `Escolha uma opção entre: ${Object.values(tempOptions).join(', ')}`)
          
          if (aiResult && aiResult.value) {
             const aiNormalized = aiResult.value.toLowerCase()
             // Tenta match reverso
             const aiFoundKey = Object.keys(tempOptions).find(key => 
                 tempOptions[key].toLowerCase() === aiNormalized
             )
             if (aiFoundKey) selectedValue = tempOptions[aiFoundKey]
          }
      }

      if (!selectedValue) {
          if (Object.keys(tempOptions).length > 0) {
              const explanation = await generateErrorExplanation(
                value,
                `Opções disponíveis: ${Object.values(tempOptions).join(', ')}`,
                'Opção inválida'
              )
              return {
                  error: explanation || 'Opção inválida. Por favor, escolha um dos números da lista.',
                  repeatStep: true
              }
          } else {
              // Se não tinha opções (lista vazia no banco), aceita o que o usuário digitou
              selectedValue = value
          }
      }

      if (stepConfig.saveField) {
          dataToSave[stepConfig.saveField] = selectedValue
      } else if (typeof selectedValue === 'object' && selectedValue !== null) {
          Object.assign(dataToSave, selectedValue)
      }

      return {
          nextStep: null,
          mappedValue: selectedValue,
          dataToSave
      }

    case 'date':
      const formattedDate = parseDate(value)
      if (!formattedDate) {
        // Fallback IA para datas naturais ("amanhã", "próxima terça")
        console.log('Tentando extrair data com IA...')
        const aiResult = await extractDataWithAI(value, 'Data do procedimento (formato DD/MM)')
        
        if (aiResult && aiResult.value) {
            // IA deve retornar YYYY-MM-DD ou DD/MM/YYYY
            // Vamos aceitar o que vier se parecer data, tentando normalizar
            const aiFormatted = parseDate(aiResult.value)
            if (aiFormatted) {
                value = aiFormatted
            } else {
                 value = aiResult.value // Aceita como string se falhar parser
            }
        } else {
            const explanation = await generateErrorExplanation(
              value,
              'Data válida no formato DD/MM (ex: 25/12) ou DD/MM/AAAA',
              'Formato de data inválido'
            )
            return {
              error: explanation || 'Data inválida. Por favor, use o formato DIA/MÊS (ex: 25/12).',
              repeatStep: true
            }
        }
      } else {
          value = formattedDate
      }
      break

    case 'time':
      if (!isValidTime(value)) {
        // Fallback IA
        const aiResult = await extractDataWithAI(value, 'Horário (formato HH:MM)')
        if (aiResult && aiResult.value) {
            value = aiResult.value
        } else {
            const explanation = await generateErrorExplanation(
              value,
              'Horário válido no formato HH:MM (ex: 14:30)',
              'Formato de horário inválido'
            )
            return {
              error: explanation || 'Horário inválido. Por favor, use o formato HH:MM (ex: 14:30).',
              repeatStep: true
            }
        }
      }
      break

    case 'media':
      // Se o usuário digitou "pular", aceita vazio
      if (value.toLowerCase() === 'pular') {
        value = null
      } 
      // Se não for "pular" e não for mídia (tratado no controller), rejeita
      // O controller deve passar o tipo da mensagem ou URL se for mídia
      // Aqui assumimos que messageContent já é a URL ou texto
      // Se for texto e não for "pular", pede foto
      else if (messageContent.startsWith('http')) {
         value = messageContent
      }
      // Se for placeholder de erro de upload
      else if (value === '[IMAGEM]' || value === '[DOCUMENTO]') {
         return {
            error: 'Não foi possível baixar a imagem. Por favor, tente enviar novamente.',
            repeatStep: true
         }
      }
      else {
         return {
            error: 'Por favor, envie uma foto ou digite "pular".',
            repeatStep: true
         }
      }
      break
  }

  // Preparar dados para salvar
  if (stepConfig.saveField) {
    dataToSave[stepConfig.saveField] = value
  }

  return {
    nextStep,
    dataToSave,
    responseMessage: flowSteps[nextStep]?.message
  }
}
