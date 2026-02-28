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



// Função Helper para enviar mensagens no Controller garantindo JID
async function saveAndSendMessage(supabase, sock, jid, conversationId, text) {
  if (sock && jid) {
    try {
      let formattedJid = String(jid);
      // Se não tiver nenhum sufixo de servidor oficial, limpa e injeta
      if (!formattedJid.includes('@s.whatsapp.net') && !formattedJid.includes('@g.us') && !formattedJid.includes('@lid')) {
        const digits = formattedJid.replace(/[^0-9]/g, '');
        formattedJid = `${digits}@s.whatsapp.net`;
      }
      console.log(`[Agente] Respondendo para JID validado: ${formattedJid}`);
      await sock.sendMessage(formattedJid, { text });
    } catch (err) {
      console.error("Erro ao enviar via sock no agentController:", err);
    }
  }
  // Recuperar organizationId para o histórico visual do Painel Web
  const { data: conv } = await supabase.from('conversations').select('organization_id').eq('id', conversationId).single();
  await salvarMensagem(conversationId, conv?.organization_id, "agent", text);
  return { texto: null, transferido: false };
}

// Handler de Fluxo e Registros a partir dos extraídos pela IA
async function handleExtractedData(conversationId, telefone, updatedJSON, content, mediaUrl, sock) {
  const { data: conv } = await supabase.from('conversations').select('*').eq('id', conversationId).single();
  let flowData = {};
  if (conv && conv.flow_data) {
    flowData = typeof conv.flow_data === "string" ? JSON.parse(conv.flow_data) : conv.flow_data;
  }

  // Preserve the attachment url in flow_data if we received it
  let attachmentUrl = flowData.attachment_url;
  if (mediaUrl) {
    attachmentUrl = mediaUrl;
  }

  // Filtrar dados nulos ou vazios gerados pela IA para não sobrescrever o que já foi coletado
  const extractedRaw = updatedJSON.extracted || {};
  const extractedClean = {};
  for (const key in extractedRaw) {
    if (extractedRaw[key] !== null && extractedRaw[key] !== "" && extractedRaw[key] !== "null") {
      extractedClean[key] = extractedRaw[key];
    }
  }

  const updatedData = { ...flowData, ...extractedClean, attachment_url: attachmentUrl };

  const status = updatedJSON.status_agendamento || 'em_andamento';

  if (status === 'cancelado') {
    await supabase.from('conversations').update({ flow_state: 'cancelled', is_bot_active: false, flow_data: updatedData }).eq('id', conversationId);
    return await saveAndSendMessage(supabase, sock, telefone, conversationId, updatedJSON.message || "Entendido! O agendamento foi cancelado.");
  }

  if (status === 'confirmado') {
    const finalData = updatedData;
    // Criar registro na tabela
    const { data: reg, error } = await supabase
      .from('registrations')
      .insert({
        organization_id: conv.organization_id,
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
      return await saveAndSendMessage(supabase, sock, telefone, conversationId, '❌ Erro ao salvar o registro no sistema. Tente novamente mais tarde.');
    }

    await supabase.from('conversations')
      .update({ flow_state: 'completed', is_bot_active: false, flow_data: updatedData })
      .eq('id', conversationId);

    let dataFormatada = finalData.procedure_date || '[Data]';
    if (dataFormatada.includes('-')) {
      dataFormatada = dataFormatada.split('-').reverse().join('/');
    }
    const pushMsg = `✅ Agendamento Confirmado! Olá ${finalData.patient_name}, seu transporte para o dia ${dataFormatada} às ${finalData.procedure_time || '[HH:MM]'} foi confirmado.\n📍 Esteja no ponto de embarque com antecedência. Bom procedimento!`;

    return await saveAndSendMessage(supabase, sock, telefone, conversationId, pushMsg);
  }

  // Se 'em_andamento'
  await supabase.from('conversations')
    .update({ flow_data: updatedData })
    .eq('id', conversationId);

  if (updatedJSON.message) {
    return await saveAndSendMessage(supabase, sock, telefone, conversationId, updatedJSON.message);
  } else {
    // Fallback caso a IA não retorne a chave "message" preenchida
    return await saveAndSendMessage(supabase, sock, telefone, conversationId, "Certo, entendi. Pode me confirmar ou informar o próximo detalhe por favor?");
  }
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
  const [{ data: historico }, { data: systemSettingsRows }, { data: boardingData }] = await Promise.all([
    supabase
      .from("messages")
      .select("sender, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("system_settings")
      .select("key, value"),
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

  // Não faremos return imediato de flowData.attachment_requested.
  // Delegaremos para o LLM gerenciar everything.

  // Tentar buscar contexto RAG (pode falhar se embeddings não estiverem configurados)
  let contextoRAG = null;
  try {
    contextoRAG = await buscarContextoRAG(mensagem);
  } catch (err) {
    console.warn("Falha ao buscar contexto RAG (possível erro de configuração de Embeddings):", err.message);
  }



  const missingFieldsMsg = "Analise os DADOS JÁ COLETADOS. Se algum campo do formato JSON abaixo estiver nulo ou vazio, pergunte explicitamente ao paciente. NÂO encerre a coleta até ter TODOS os campos.";

  let ragContext = "Sem base de conhecimento adicional fornecida pelo admin.";
  let persona = "Clara, assistente virtual simpática da Secretaria Municipal de Saúde de Angicos-RN.";
  let instrucoesExtras = "";
  let avisos = "";

  let aiCreativity = 0.7;
  let serviceHoursActive = false;
  let serviceHoursStart = "08:00";
  let serviceHoursEnd = "18:00";
  let welcomeMessageLocal = "Olá! Seja bem-vindo ao atendimento.";

  // Transform db records into object
  let s = {};
  if (systemSettingsRows && systemSettingsRows.length > 0) {
    systemSettingsRows.forEach(row => {
      s[row.key] = row.value;
    });

    if (s.ai_persona) persona = s.ai_persona;
    if (s.ai_instructions) instrucoesExtras = `\nINSTRUÇÕES ADICIONAIS DE CONDUTA:\n${s.ai_instructions}\n`;
    if (s.bot_notices) avisos = `\nAVISOS IMPORTANTES E RECADOS:\n${s.bot_notices}\n`;

    if (s.ai_creativity !== undefined) aiCreativity = parseFloat(s.ai_creativity);
    if (s.welcome_message) welcomeMessageLocal = s.welcome_message;
    if (s.service_hours) {
      serviceHoursActive = !!s.service_hours.active;
      serviceHoursStart = s.service_hours.start || "08:00";
      serviceHoursEnd = s.service_hours.end || "18:00";
    }

    if (s.ai_knowledge_base) {
      try {
        const kbObj = typeof s.ai_knowledge_base === 'string' ? JSON.parse(s.ai_knowledge_base) : s.ai_knowledge_base;
        let combined = [];
        for (const [cat, text] of Object.entries(kbObj)) {
          if (text && typeof text === 'string' && text.trim().length > 0) {
            combined.push(`--- DOMÍNIO / CATEGORIA: ${cat.toUpperCase()} ---\n${text}`);
          }
        }
        if (combined.length > 0) {
          ragContext = combined.join('\n\n');
        }
      } catch (e) {
        ragContext = s.ai_knowledge_base;
      }
    }
  }

  // Interceptação de Horário de Atendimento
  if (serviceHoursActive) {
    const now = new Date();
    // Converter para fuso horário do Brasil
    const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentHour = brTime.getHours();
    const currentMin = brTime.getMinutes();
    const currentTotalMins = currentHour * 60 + currentMin;

    const [startH, startM] = serviceHoursStart.split(':').map(Number);
    const startTotalMins = startH * 60 + startM;

    const [endH, endM] = serviceHoursEnd.split(':').map(Number);
    const endTotalMins = endH * 60 + endM;

    let isOutsideHours = false;

    if (startTotalMins <= endTotalMins) {
      // Normal de 08:00 as 18:00
      if (currentTotalMins < startTotalMins || currentTotalMins > endTotalMins) {
        isOutsideHours = true;
      }
    } else {
      // Virada de madrugada, ex: 22:00 as 06:00
      if (currentTotalMins < startTotalMins && currentTotalMins > endTotalMins) {
        isOutsideHours = true;
      }
    }

    // Se for a primeira mensagem ou fora do horário recusa atendimento automatizado via IA
    if (isOutsideHours) {
      console.log(`Mensagem recebida fora do horário comercial (${serviceHoursStart} - ${serviceHoursEnd}). Restringindo IA.`);

      const txtFora = `Olá! Nosso horário de atendimento no momento é das ${serviceHoursStart} às ${serviceHoursEnd}. Por favor, aguarde ou retorne amanhã nesse horário!\n\n${s.bot_notices || ''}`;
      return await saveAndSendMessage(supabase, sock, telefone, conversationId, txtFora);
    }
  }

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

  const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  let neighborhoodsString = Object.keys(locationsMap)
    .map((n, idx) => `${emojiNumbers[idx % 10]} Bairro: ${n}`)
    .join('\n');
  if (!neighborhoodsString) neighborhoodsString = "Nenhum bairro cadastrado.";

  const dynamicSystemPrompt = `
Você é ${persona}
Ajuda cidadãos com saúde e transporte gratuito.
HOJE É: ${dataHoraAtual}
${avisos}${instrucoesExtras}

OBJETIVO PRINCIPAL E MENU:
Garantir que todo atendimento comece identificando a intenção do usuário antes de qualquer ação.
Sempre que iniciar uma conversa ou o usuário não tiver selecionado nada ainda (Ou disser apenas um Bom Dia, Oi, Olá) , você DEVE apresentar o texto de boas vindas inicial: "${welcomeMessageLocal}" e as opções abaixo:
1️⃣ Fazer uma pergunta
2️⃣ Agendar transporte/procedimento
3️⃣ Consultar agendamento existente

COMPORTAMENTOS PROIBIDOS:
- INICIAR AGENDAMENTO AUTOMATICAMENTE sem que o usuário tenha escolhido a opção 2 explicitamente.
- ASSUMIR intenção do usuário sem confirmação. Se ele disser apenas "Oi", mostre o menu.
- PULAR o menu inicial.
- MISTURAR fluxos (ex: responder pergunta e já emendar pedindo nome para agendar).
- Iniciar coleta de dados antes da escolha clara da Opção 2.
- Caso o usuário digite algo fora das opções do menu inicial (e não tenha escolhido ainda), diga que não entendeu The e mostre o menu novamente.

MÁQUINA DE ESTADOS (MEMÓRIA DE FLUXO):
Com base no histórico da conversa, identifique em qual fluxo o usuário está no momento. NÃO repita o menu se ele já estiver dentro de um fluxo válido, a não ser que ele peça para voltar "menu". Reconheça as intenções tanto pelo número (1,2,3) quanto pelo texto (ex: "quero agendar" = 2).

### SE O USUÁRIO ESCOLHER 1 (FAZER PERGUNTA):
- Responda dúvidas livremente usando sua base de dados RAG.
- Responda normalmente e não inicie agendamento.

### SE O USUÁRIO ESCOLHER 2 (AGENDAR):
Inicie a coleta dos dados obrigatórios. Siga TODAS as regras de Agendamento:
1. COLETE TODOS OS DADOS (pergunte todos, um por vez). Nunca infira ou gere dados sozinhos.
2. Campos:
   - Nome completo
   - Telefone completo (DDD + Número). NÃO exija formato exato. Se for inteligível, SALVE e prossiga.
   - Tipo: Consulta OU Exame
   - Especialidade (consulta) ou tipo de exame
   - Data do procedimento (DD/MM/AAAA)
   - Horário do procedimento (HH:MM)
   - Cidade do local (pergunte explicitamente - nunca assuma Angicos).
   - Nome do local (Clínica/Hospital)
   - Precisa de Acompanhante? (Sim/Não)
   - Motivo do Acompanhante (Se respondeu SIM à pergunta anterior)
   - Bairro de embarque (Liste TODOS organizados com emojis numéricos como opções clicáveis: \n${neighborhoodsString}\n)
   - Ponto de embarque (APÓS Bairro válido, Liste TODOS os pontos reais: \n${locationsString}\n Use emojis numéricos para listar)
   - Foto do comprovante
3. PERGUNTE UM CAMPO POR VEZ. Não emende duas perguntas.
4. CANCELAMENTO: Se quiser desistir, pergunte se quer cancelar (SIM p/ cancelar, NÃO p/ voltar).
5. FOTO OBRIGATÓRIA: Peça apenas ao final dos textos. Se enviar, chegará "[ARQUIVO/IMAGEM RECEBIDA]".
6. CONFIRMAÇÃO RESUMIDA: Ao final de TUDO (incluindo a foto), mostre o Resumo e pergunte "Está tudo correto? (SIM/NÃO)".
7. SE SIM, marque "status_agendamento": "confirmado" e mande aguardar.

### SE O USUÁRIO ESCOLHER 3 (CONSULTAR AGENDAMENTO):
- Solicite os dados para localizar o agendamento (exemplo: "Qual o seu nome completo e a data que você agendou?").
- Após ele informar, com base nos dados e no seu conhecimento/sistema, retorne as informações do agendamento dele. (Diga as infos que possui ou que não localizou).

---
BASE DE CONHECIMENTO DISPONÍVEL (RAG):
${ragContext}

DADOS JÁ COLETADOS (APENAS PARA FLUXO 2): ${JSON.stringify(flowData)}

CRÍTICO: RETORNE APENAS UM JSON VÁLIDO.
O JSON deve sempre ser assim:
{
  "message": "sua resposta final aqui de acordo com o fluxo escolhido",
  "status_agendamento": "em_andamento",
  "has_photo": false,
  "extracted": {
    "CHAVE_NOVA_1": "VALOR EXTRAÍDO NESTA ÚLTIMA MENSAGEM",
    "CHAVE_NOVA_2": "VALOR EXTRAÍDO NESTA ÚLTIMA MENSAGEM"
  }
}

REGRA DE PREENCHIMENTO DO EXTRACTED:
- O bloco "extracted" DEVE conter APENAS a informação nova que o usuário acabou de fornecer em resposta à sua última pergunta. NUNCA reenvie propriedades que já estão nos "DADOS JÁ COLETADOS".
- NUNCA invente, presuma ou gere nomes, números ou dados fictícios.
- Se o usuário escolher uma opção numérica de um Bairro ou Ponto de Embarque, OBRIGATORIAMENTE extraia e SALVE O NOME TEXTUAL REAL dessa opção, NÃO O NÚMERO (ex: se "1" era "Centro", salve "Centro", nunca "1").
- Os campos aceitáveis para se extrair são APENAS estes: "patient_name", "patient_phone", "procedure_type", "procedure_name", "procedure_date", "procedure_time", "city", "location", "boarding_neighborhood", "boarding_point", "needs_companion", "companion_reason".
`;

  const inputValue = mediaUrl ? `[ARQUIVO/IMAGEM RECEBIDA] ${mensagem || ''}` : mensagem;
  const messages = [
    { role: "system", content: dynamicSystemPrompt },
    ...mensagensOrdenadas,
    { role: "user", content: inputValue }
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
        temperature: aiCreativity,
        response_format: { type: "json_object" } // Exigir JSON
      });

      const responseMessage = completion.choices[0].message;

      if (responseMessage.content) {
        try {
          // Tentar extrair do markdown se vier com ```json
          let jsonText = responseMessage.content;
          if (jsonText.includes('```json')) {
            jsonText = jsonText.split('```json')[1].split('```')[0];
          } else if (jsonText.includes('```')) {
            jsonText = jsonText.split('```')[1].split('```')[0];
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
      await saveAndSendMessage(supabase, sock, targetJid, conversationId, "Desculpe, estou com dificuldades técnicas momentâneas. Tente novamente em alguns segundos.");
      return { texto: null, transferido: false };
    }
  }

  await saveAndSendMessage(supabase, sock, targetJid, conversationId, "Desculpe, tive uma dificuldade técnica rápida. Tente de novo! 😊");
  return { texto: null, transferido: false };
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

