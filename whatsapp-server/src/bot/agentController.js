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
            nome: { type: "string" },
            telefone: { type: "string" },
            servico: { type: "string" },
            data_preferida: { type: "string" },
            observacoes: { type: "string" }
        },
        required: ["nome", "telefone", "servico"]
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

export async function processarMensagemComIA(telefone, mensagem) {
  const dataHoraAtual = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  // 1. Buscar detalhes da conversa
  // Ajuste para garantir que o telefone esteja limpo (apenas números) caso venha formatado
  const telefoneLimpo = telefone.replace(/[^0-9]/g, '');
  
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    // Tenta buscar tanto pelo formato completo quanto pelo limpo
    .or(`contact_phone.eq.${telefone},contact_phone.eq.${telefoneLimpo}`)
    .limit(1)
    .single();

  let conversationId;

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
  }

  // 2. Buscar histórico

  const { data: historico } = await supabase
    .from("messages")
    .select("sender, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);

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
    .select("organization_id")
    .eq("id", conversationId)
    .single();
  
  const organizationId = convData?.organization_id;

  // Tentar buscar contexto RAG (pode falhar se embeddings não estiverem configurados)
  let contextoRAG = null;
  try {
      contextoRAG = await buscarContextoRAG(mensagem);
  } catch (err) {
      console.warn("Falha ao buscar contexto RAG (possível erro de configuração de Embeddings):", err.message);
  }

  const historicoResumo = mensagensOrdenadas.length > 0
    ? `Últimas ${mensagensOrdenadas.length} mensagens trocadas.`
    : null;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT({ contextoRAG, historicoResumo, dataHoraAtual }) },
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
            tools: TOOLS,
            tool_choice: "auto"
        });

        const responseMessage = completion.choices[0].message;
        
        // Adiciona a resposta do assistente ao histórico da sessão atual
        messages.push(responseMessage);

        // Se tiver conteúdo de texto, salvar e retornar (mas verificar se tem tool_calls também)
        if (responseMessage.content && !responseMessage.tool_calls) {
            await salvarMensagem(conversationId, organizationId, "agent", responseMessage.content);
            return { texto: responseMessage.content, transferido: false };
        }

        // Processar Tool Calls
        if (responseMessage.tool_calls) {
            const toolCalls = responseMessage.tool_calls;
            
            for (const toolCall of toolCalls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);
                
                const functionResult = await executarFerramenta(functionName, functionArgs, telefone);
                
                // Adicionar resultado da ferramenta ao histórico
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(functionResult)
                });

                if (functionName === "transferir_humano") {
                    return { texto: null, transferido: true, motivo: functionArgs.motivo };
                }
            }
            // Loop continua para a IA gerar a resposta final baseada nos resultados das ferramentas
        } else {
             // Caso raro: sem tool calls e sem content?
             if (responseMessage.content) {
                 await salvarMensagem(conversationId, organizationId, "agent", responseMessage.content);
                 return { texto: responseMessage.content, transferido: false };
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

async function salvarMensagem(conversationId, organizationId, sender, content) {
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    organization_id: organizationId,
    sender, // 'agent'
    content,
    type: "text",
    status: "delivered",
    created_at: new Date().toISOString()
  });
}
