import OpenAI from "openai";
import { supabase } from "../../lib/supabase.js";

export async function buscarContextoRAG(query, limite = 4, similaridadeMinima = 0.65) {
  try {
    // Lazy load OpenAI to ensure env vars are loaded
    const openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });

    // Tentar gerar embedding via OpenRouter (se suportado) ou falhar silenciosamente
    // Nota: OpenRouter foca em Chat. Se este endpoint falhar, o RAG será ignorado.
    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002", // Tenta usar modelo padrão compatível
        input: query,
    });

    const embedding = embeddingResponse.data[0].embedding;

    const { data: resultados, error } = await supabase.rpc("buscar_conhecimento", {
      query_embedding: embedding,
      limite,
      similaridade_minima: similaridadeMinima
    });

    if (error || !resultados?.length) return null;

    return resultados
      .map(r => `[${r.titulo}]\n${r.conteudo}`)
      .join("\n\n---\n\n");

  } catch (err) {
    console.warn("[RAG] Erro ao buscar contexto (Embeddings não configurado ou indisponível):", err.message);
    return null;
  }
}
