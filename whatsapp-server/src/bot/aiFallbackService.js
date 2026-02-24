import axios from 'axios'

const API_URL = process.env.API_URL || 'http://localhost:3000'

export async function extractDataWithAI(text, context) {
  try {
    const response = await axios.post(`${API_URL}/api/ai/extract-data`, {
      text,
      context // e.g., "procedure_type", "date", etc.
    })
    
    return response.data // Should return { extracted: ..., confidence: ... }
  } catch (error) {
    console.error('Erro ao chamar IA fallback:', error.message)
    return null
  }
}

export async function generateErrorExplanation(input, context, errorType) {
  try {
    const response = await axios.post(`${API_URL}/api/ai/explain-error`, {
      input,
      context,
      errorType
    })
    
    return response.data.reply || null
  } catch (error) {
    console.error('Erro ao chamar IA de explicação:', error.message)
    return null
  }
}

export async function analyzeIntent(text) {
  try {
    const response = await axios.post(`${API_URL}/api/ai/analyze-intent`, {
      text
    })
    return response.data
  } catch (error) {
    console.error('Erro ao chamar IA de intenção:', error.message)
    return { intent: 'unknown' }
  }
}
