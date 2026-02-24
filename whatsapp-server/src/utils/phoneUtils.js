export const cleanPhone = (phone) => {
  if (!phone) return ''
  
  const strPhone = String(phone)
  
  // Se já tiver um sufixo válido de JID, preserva tudo (incluindo @ e .)
  if (strPhone.includes('@s.whatsapp.net') || strPhone.includes('@g.us') || strPhone.includes('@lid')) {
      return strPhone
  }
  
  // Caso contrário, remove tudo que não for número (comportamento padrão para telefones brutos)
  return strPhone.replace(/[^0-9]/g, '')
}

export const formatJid = (phone) => {
  if (!phone) return ''
  
  const strPhone = String(phone)

  // 1. Se for grupo ou LID, retorna como está
  if (strPhone.includes('@g.us') || strPhone.includes('@lid')) {
    return strPhone
  }

  // 2. Limpar qualquer sufixo existente (@s.whatsapp.net, @) e manter apenas dígitos
  // Isso resolve o problema de JIDs malformados como '12345@' virando '12345@@s.whatsapp.net'
  const digits = strPhone.replace(/[^0-9]/g, '')

  // 3. Adicionar sufixo padrão
  return `${digits}@s.whatsapp.net`
}

export const extractPhoneFromJid = (jid) => {
  if (!jid) return ''
  
  // Se for LID, retorna o JID completo pois não dá para extrair número
  if (jid.includes('@lid')) {
      return jid
  }
  
  return jid.split('@')[0].split(':')[0]
}
