import OpenAI from "openai";
import { supabase } from "../lib/supabase.js";
import { SYSTEM_PROMPT } from "./prompts/system.js";
import { buscarContextoRAG } from "./rag/retriever.js";
import { executarFerramenta } from "./tools/executor.js";

// Instancia OpenAI dentro da função para garantir carregamento do .env
const createOpenAIClient = () => {
  // Verificar se a chave existe, senão logar erro (mas não crashar o server na inicialização)
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("ERRO: OPENROUTER_API_KEY não encontrada no process.env!");
  }
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });
};

// Conversão das ferramentas para o formato OpenAI
const TOOLS = [
  {
    type: "function",
    function: {
      name: "buscar_conhecimento_rag",
      description: "Busca informações na base de conhecimento da empresa. Use sempre que o cliente fizer perguntas sobre serviços, preços, políticas ou localização.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto da busca semântica" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "verificar_disponibilidade",
      description: "Verifica horários disponíveis para agendamento",
      parameters: {
        type: "object",
        properties: {
          data_desejada: { type: "string", description: "Data no formato YYYY-MM-DD" },
          tipo_servico: { type: "string" }
        },
        required: ["data_desejada"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "criar_registro",
      description: "Salva os dados coletados do cliente. Use SOMENTE após confirmar todos os dados com o cliente.",
      parameters: {
        type: "object",
        properties: {
          patient_name: { type: "string" },
          patient_phone: { type: "string" },
          procedure_type: { type: "string" },
          procedure_name: { type: "string" },
          procedure_date: { type: "string" },
          procedure_time: { type: "string" },
          location: { type: "string" },
          city: { type: "string" },
          boarding_neighborhood: { type: "string" },
          boarding_point: { type: "string" },
          needs_companion: { type: "boolean" },
          companion_reason: { type: "string" }
        },
        required: ["patient_name", "patient_phone", "procedure_type", "procedure_date", "location", "boarding_point"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transferir_humano",
      description: "Transfere o atendimento para um humano. Use quando: cliente pediu, situação complexa, reclamação, ou após 3 tentativas sem entender.",
      parameters: {
        type: "object",
        properties: {
          motivo: { type: "string" },
          resumo_conversa: { type: "string" }
        },
        required: ["motivo"]
      }
    }
  }
];



// Função Helper solicitada pelo usuário para enviar mensagens no Controller
async function saveAndSendMessage(supabase, sock, jid, conversationId, text) {
  if (sock && jid) {
    try {
      let formattedJid = String(jid);
      if (!formattedJid.includes('@') && !formattedJid.includes('g.us')) {
        const digits = formattedJid.replace(/[^0-9]/g, '');
        formattedJid = `${digits}@s.whatsapp.net`;
      }
      await sock.sendMessage(formattedJid, { text });
    } catch (err) {
      console.error("Erro ao enviar via sock no agentController:", err);
    }
  }
  // Recuperar organizationId
  const { data: conv } = await supabase.from('conversations').select('organization_id').eq('id', conversationId).single();
  await salvarMensagem(conversationId, conv?.organization_id, "agent", text);
  return { texto: null, transferido: false };
}

// Handler de Foto/Comprovante (BUG 4) ou Atualização
async function handleExtractedData(conversationId, telefone, updatedJSON, content, mediaUrl, sock) {
  const { data: conv } = await supabase.from('conversations').select('*').eq('id', conversationId).single();
  let flowData = {};
  if (conv && conv.flow_data) {
    flowData = typeof conv.flow_data === "string" ? JSON.parse(conv.flow_data) : conv.flow_data;
  }

  // Mesclar dados
  const updatedData = { ...flowData, ...(updatedJSON.extracted || {}) };

  // Se está esperando anexo
  if (flowData.attachment_requested) {
    const isSkip = content.toLowerCase().includes('pular');
    const attachmentUrl = isSkip ? null : (mediaUrl || null);

    const finalData = { ...flowData, attachment_url: attachmentUrl };

    // Criar registro na tabela FINAL registrations
    const { data: reg, error } = await supabase
      .from('registrations')
      .insert({
        conversation_id: conversationId,
        patient_name: finalData.patient_name,
        patient_phone: finalData.patient_phone,
        procedure_type: finalData.procedure_type,
        procedure_name: finalData.procedure_name,
        procedure_date: finalData.procedure_date,
        procedure_time: finalData.procedure_time,
        location: finalData.location,
        city: finalData.city || 'Angicos',
        boarding_neighborhood: finalData.boarding_neighborhood,
        boarding_point: finalData.boarding_point,
        needs_companion: finalData.needs_companion === true ||
          finalData.needs_companion === 'true' ||
          String(finalData.needs_companion).toLowerCase() === 'sim',
        companion_reason: finalData.companion_reason || null,
        attachment_url: finalData.attachment_url,
        status: 'pending'
      })
      .select().single();

    if (error) {
      console.error('[AGENT] Erro ao criar registro:', error);
      return await saveAndSendMessage(supabase, sock, telefone, conversationId, '❌ Erro ao salvar. Tente novamente ou ligue para a Secretaria.');
    }

    await supabase.from('conversations')
      .update({ flow_state: 'completed', is_bot_active: false })
      .eq('id', conversationId);

    const msgConfirmacao = `✅ *Pedido registrado com sucesso!*\n\n` +
      `📋 *Resumo:*\n` +
      `👤 ${finalData.patient_name}\n` +
      `🏥 ${finalData.procedure_type}: ${finalData.procedure_name || 'N/A'}\n` +
      `📅 ${finalData.procedure_date} às ${finalData.procedure_time || 'N/A'}\n` +
      `📍 ${finalData.location}\n` +
      `🚌 ${finalData.boarding_point}, ${finalData.boarding_neighborhood}\n\n` +
      `⏳ A Secretaria irá confirmar em breve. Obrigada! 😊`;

    return await saveAndSendMessage(supabase, sock, telefone, conversationId, msgConfirmacao);
  }

  // Verificar se todos os campos obrigatórios estão preenchidos
  const REQUIRED = ['patient_name', 'patient_phone', 'procedure_type',
    'procedure_date', 'location', 'boarding_point'];

  const allCollected = REQUIRED.every(f =>
    updatedData[f] !== undefined && updatedData[f] !== null && updatedData[f] !== ''
  );

  if (allCollected && !flowData.attachment_requested) {
    await supabase.from('conversations')
      .update({ flow_data: { ...updatedData, attachment_requested: true } })
      .eq('id', conversationId);

    return await saveAndSendMessage(supabase, sock, telefone, conversationId,
      '📎 Quase pronto! Por favor, envie uma *foto* do seu comprovante ou encaminhamento médico.\n\n_Se não tiver, digite *pular*_');
  }

  // Se não coletou tudo, apenas atualizar flow_data e mandar msg original da IA
  await supabase.from('conversations')
    .update({ flow_data: updatedData })
    .eq('id', conversationId);

  if (updatedJSON.message) {
    return await saveAndSendMessage(supabase, sock, telefone, conversationId, updatedJSON.message);
  }

  return { texto: null, transferido: false };
}

export async function processarMensagemComIA(telefone, mensagem, mediaUrl = null, sock = null) {
  const dataHoraAtual = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  // 1. Buscar detalhes da conversa
  // Ajuste para garantir que o telefone esteja limpo (apenas números) caso venha formatado
  const telefoneLimpo = telefone.replace(/[^0-9]/g, '');

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, contact_jid")
    .or(`contact_phone.eq.${telefone},contact_phone.eq.${telefoneLimpo}`)
    .limit(1)
    .single();

  let conversationId;
  let targetJid = telefone;

  if (!conversation) {
    console.log("Conversa não encontrada. Criando nova conversa para:", telefone);

    const { data: newConv, error: createError } = await supabase
      .from("conversations")
      .insert({
        contact_phone: telefone,
        contact_name: telefone,
        is_bot_active: true,
        created_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Erro ao criar nova conversa:", createError);
      return { texto: null, transferido: false };
    }

    conversationId = newConv.id;
  } else {
    conversationId = conversation.id;
    if (conversation.contact_jid) targetJid = conversation.contact_jid;
  }

  // 2. Buscar histórico e Configurações (RAG)
  const [{ data: historico }, { data: adminSettings }, { data: boardingData }] = await Promise.all([
    supabase
      .from("messages")
      .select("sender, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("admin_settings")
      .select("settings")
      .single(),
    supabase
      .from("boarding_locations")
      .select("neighborhood, point_name")
  ]);

  const mensagensOrdenadas = (historico || [])
    .reverse()
    .map(m => ({
      role: m.sender === 'contact' ? 'user' : 'assistant',
      content: m.content
    }));

  // Remover a última mensagem se for igual à atual
  if (mensagensOrdenadas.length > 0) {
    const lastMsg = mensagensOrdenadas[mensagensOrdenadas.length - 1];
    if (lastMsg.role === 'user' && lastMsg.content === mensagem) {
      mensagensOrdenadas.pop();
    }
  }

  // Recuperar organization_id da conversa para uso posterior
  const { data: convData } = await supabase
    .from("conversations")
    .select("organization_id, flow_data")
    .eq("id", conversationId)
    .single();

  let flowData = {};
  if (convData && convData.flow_data) {
    flowData = typeof convData.flow_data === "string" ? JSON.parse(convData.flow_data) : convData.flow_data;
  }

  if (flowData.attachment_requested) {
    return await handleExtractedData(conversationId, targetJid, {}, mensagem, mediaUrl, sock);
  }

  const organizationId = convData?.organization_id;

  // Tentar buscar contexto RAG (pode falhar se embeddings não estiverem configurados)
  let contextoRAG = null;
  try {
    contextoRAG = await buscarContextoRAG(mensagem);
  } catch (err) {
    console.warn("Falha ao buscar contexto RAG (possível erro de configuração de Embeddings):", err.message);
  }



  const missingFieldsMsg = "Analise os DADOS JÁ COLETADOS. Se algum campo do formato JSON abaixo estiver nulo ou vazio, pergunte explicitamente ao paciente. NÂO encerre a coleta até ter TODOS os campos.";

  const ragContext = adminSettings?.settings?.ai_knowledge_base || "Sem base de conhecimento adicional fornecida pelo admin.";

  // Format boarding locations for prompt
  const locationsMap = {};
  if (boardingData) {
    boardingData.forEach(loc => {
      if (!locationsMap[loc.neighborhood]) locationsMap[loc.neighborhood] = [];
      locationsMap[loc.neighborhood].push(loc.point_name);
    });
  }
  let locationsString = Object.entries(locationsMap)
    .map(([nHood, points]) => `- Bairro ${nHood}: ${points.join(', ')}`)
    .join('\n');
  if (!locationsString) locationsString = "Nenhum local cadastrado. Aceite o que o paciente disser.";

  const dynamicSystemPrompt = `
Você é Clara, assistente virtual simpática da Secretaria Municipal de Saúde de Angicos-RN.
Ajuda cidadãos a solicitar transporte gratuito para consultas/exames.
HOJE É: ${dataHoraAtual}

REGRAS:
1. Sem viagens fins de semana (sábado/domingo).
2. Só para consultas/exames médicos agendados.
3. Linguagem simples (muitos usuários são idosos).
4. CRÍTICO: Faça APENAS UMA pergunta por vez. Não liste múltiplos campos de uma vez. Primeiro colete o nome, depois o telefone, etc. Seja natural como um humano faria.
5. Entenda linguagem natural: "quinta feira", "amanhã", "10h".
6. LOCAIS DE EMBARQUE: Ao perguntar o bairro de embarque, OFEREÇA as seguintes opções de Bairros e seus Pontos de referência cadastrados:
${locationsString}
Obrigatório que o json extraia exatamente as palavras fornecidas pela lista em "boarding_neighborhood" e "boarding_point".
7. PROIBIDO: NUNCA diga que o transporte "está agendado" ou escreva uma mensagem de encerramento final. Apenas diga "Aguarde um instante, estou processando..." quando achar que finalizou de coletar tudo.

BASE DE CONHECIMENTO DISPONÍVEL (RAG):
${ragContext}

DADOS JÁ COLETADOS: ${JSON.stringify(flowData)}
DADOS QUE FALTAM: ${missingFieldsMsg}

CRÍTICO: RETORNE APENAS UM JSON VÁLIDO. NÃO USE MARKDOWN. NÃO USE TEXT FORA DO JSON.
Formato exato esperado:
{
  "message": "pergunta a ser feita ao usuário (sua resposta como Clara)",
  "extracted": {
    "patient_name": "Nome do Paciente",
    "patient_phone": "Telefone com DDD",
    "procedure_type": "Consulta | Exame",
    "procedure_name": "Especialidade ou Nome do Exame",
    "procedure_date": "YYYY-MM-DD",
    "procedure_time": "HH:MM",
    "location": "Nome da Clínica/Hospital",
    "city": "Angicos",
    "boarding_neighborhood": "Bairro de Embarque",
    "boarding_point": "Ponto de Referência exato",
    "needs_companion": false,
    "companion_reason": "Motivo se precisar acompanhante"
  },
  "all_collected": false
}
`;

  const messages = [
    { role: "system", content: dynamicSystemPrompt },
    ...mensagensOrdenadas,
    { role: "user", content: mensagem }
  ];

  let iteracoes = 0;
  const MAX_ITERACOES = 10;

  const openai = createOpenAIClient();
  const MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet:beta";

  while (iteracoes < MAX_ITERACOES) {
    iteracoes++;

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: messages,
        response_format: { type: "json_object" } // Exigir JSON
      });

      const responseMessage = completion.choices[0].message;

      if (responseMessage.content) {
        try {
          // Tentar extrair do markdown se vier com ```json
          let jsonText = responseMessage.content;
          if (jsonText.includes('\`\`\`json')) {
            jsonText = jsonText.split('\`\`\`json')[1].split('\`\`\`')[0];
          } else if (jsonText.includes('\`\`\`')) {
            jsonText = jsonText.split('\`\`\`')[1].split('\`\`\`')[0];
          }

          const aiData = JSON.parse(jsonText.trim());
          return await handleExtractedData(conversationId, targetJid, aiData, mensagem, mediaUrl, sock);
        } catch (e) {
          console.error("Erro ao parsear JSON da IA, retornando text:", responseMessage.content);
          // Fallback: se falhar o parse, assumir que é só a resposta textual e não extraiu nada
          return await handleExtractedData(conversationId, targetJid, { message: responseMessage.content, extracted: {} }, mensagem, mediaUrl, sock);
        }
      }
    } catch (error) {
      console.error("Erro na API do OpenRouter:", error);
      return {
        texto: "Desculpe, estou com dificuldades técnicas momentâneas. Tente novamente em alguns segundos.",
        transferido: false
      };
    }
  }

  return {
    texto: "Desculpe, tive uma dificuldade técnica. Um atendente irá te ajudar em breve! 😊",
    transferido: true,
    motivo: "max_iteracoes_excedido"
  };
}

// Helper para salvar a mensagem disparada pela IA no DB
async function salvarMensagem(conversationId, organizationId, sender, content) {
  try {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      organization_id: organizationId,
      sender, // 'agent'
      content,
      type: "text",
      status: "delivered", // Status fixo permitido pelo DB
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("Erro ao salvarMensagem no agentController:", err);
  }
}

