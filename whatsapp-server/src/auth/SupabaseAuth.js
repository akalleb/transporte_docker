import { initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys'

export const useSupabaseAuthState = async (supabase, sessionId) => {
    // 1. Carregar credenciais iniciais
    const { data: credsData } = await supabase
        .from('whatsapp_sessions')
        .select('data')
        .eq('id', `${sessionId}_creds`)
        .maybeSingle() // Use maybeSingle to avoid errors if not found

    let creds;
    if (credsData && credsData.data) {
        try {
            creds = JSON.parse(credsData.data, BufferJSON.reviver)
        } catch (e) {
            console.error('Erro ao parsear credenciais, iniciando novas:', e)
            creds = initAuthCreds()
        }
    } else {
        creds = initAuthCreds()
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const keys = {}
                    const idsToFetch = ids.map(id => `${sessionId}_${type}_${id}`)
                    
                    if (idsToFetch.length === 0) return keys

                    const { data, error } = await supabase
                        .from('whatsapp_sessions')
                        .select('id, data')
                        .in('id', idsToFetch)

                    if (error) console.error('Erro ao buscar chaves WhatsApp:', error)
                    
                    if (data) {
                        data.forEach(row => {
                            // Extract original ID from the composite key
                            // Format: sessionId_type_originalId
                            const prefix = `${sessionId}_${type}_`
                            if (row.id.startsWith(prefix)) {
                                const keyId = row.id.substring(prefix.length)
                                try {
                                    keys[keyId] = JSON.parse(row.data, BufferJSON.reviver)
                                } catch (e) {
                                    console.error(`Erro parseando chave ${keyId}:`, e)
                                }
                            }
                        })
                    }
                    return keys
                },
                set: async (data) => {
                    const rowsToUpsert = []
                    const idsToDelete = []

                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id]
                            const key = `${sessionId}_${category}_${id}`
                            
                            if (value) {
                                rowsToUpsert.push({
                                    id: key,
                                    data: JSON.stringify(value, BufferJSON.replacer),
                                    updated_at: new Date()
                                })
                            } else {
                                idsToDelete.push(key)
                            }
                        }
                    }

                    if (idsToDelete.length > 0) {
                        await supabase.from('whatsapp_sessions').delete().in('id', idsToDelete)
                    }

                    if (rowsToUpsert.length > 0) {
                        // Batch upsert for performance
                        const { error } = await supabase.from('whatsapp_sessions').upsert(rowsToUpsert)
                        if (error) console.error('Erro ao salvar sessão WhatsApp:', error)
                    }
                }
            }
        },
        saveCreds: async () => {
            const { error } = await supabase.from('whatsapp_sessions').upsert({
                id: `${sessionId}_creds`,
                data: JSON.stringify(creds, BufferJSON.replacer),
                updated_at: new Date()
            })
            if (error) console.error('Erro ao salvar credenciais WhatsApp:', error)
        }
    }
}
