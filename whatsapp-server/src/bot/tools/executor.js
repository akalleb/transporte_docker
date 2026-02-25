import { supabase } from "../../lib/supabase.js";
import { buscarContextoRAG } from "../rag/retriever.js";

export async function executarFerramenta(nomeFerramenta, parametros, telefone) {
  console.log(`[MCP Tool] ${nomeFerramenta}`, parametros);

  switch (nomeFerramenta) {

    case "buscar_conhecimento_rag": {
      const resultado = await buscarContextoRAG(parametros.query);
      return resultado || "Nenhuma informação encontrada na base de conhecimento.";
    }

    case "verificar_disponibilidade": {
      // Ajuste para tabela real se diferente de 'disponibilidade'
      const { data: slots, error } = await supabase
        .from("disponibilidade")
        .select("horario, disponivel")
        .eq("data", parametros.data_desejada)
        .eq("disponivel", true)
        .limit(5);
      
      if (error) {
          console.error("Erro ao verificar disponibilidade:", error);
          // Retornar mensagem amigável se tabela não existir
          return "Não foi possível verificar a disponibilidade no momento.";
      }

      if (!slots?.length) return "Nenhum horário disponível nesta data.";
      return `Horários disponíveis: ${slots.map(s => s.horario).join(", ")}`;
    }

    case "criar_registro": {
      // Recuperar conversation_id se necessário para vincular
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("contact_phone", telefone) // Ajustado para contact_phone
        .single();
        
      const { error } = await supabase.from("registrations").insert({
        ...parametros,
        conversation_id: conversation?.id,
        patient_phone: telefone, // Ajustado para patient_phone
        status: "pendente",
        // origem: "whatsapp_bot", // Campo pode não existir no schema atual, comentar se der erro
        created_at: new Date().toISOString()
      });

      if (error) return `Erro ao salvar: ${error.message}`;
      return "Registro criado com sucesso.";
    }

    case "transferir_humano": {
      await supabase
        .from("conversations")
        .update({
          is_bot_active: false,
          transfer_reason: parametros.motivo,
          transfer_summary: parametros.resumo_conversa,
          transferred_at: new Date().toISOString()
        })
        .eq("contact_phone", telefone); // Ajustado para contact_phone

      return "Transferência realizada.";
    }

    default:
      return `Ferramenta "${nomeFerramenta}" não reconhecida.`;
  }
}
