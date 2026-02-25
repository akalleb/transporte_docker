import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

async function gerarEmbedding(texto) {
  try {
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: texto,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Erro ao gerar embedding:", error.message);
    return null;
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { markdown, category } = body;

  if (!markdown) {
      throw createError({ statusCode: 400, statusMessage: "Markdown content is required" });
  }

  // 1. Quebrar Markdown em seções (simples: por títulos ##)
  const sections = markdown.split(/^##\s+/gm).filter(s => s.trim().length > 0);
  
  const results = [];

  for (const section of sections) {
      const lines = section.split('\n');
      const titulo = lines[0].trim();
      const conteudo = lines.slice(1).join('\n').trim();
      
      if (!titulo || !conteudo) continue;

      // Gerar Embedding
      const embedding = await gerarEmbedding(`${titulo}\n\n${conteudo}`);

      if (embedding) {
          // Salvar no Supabase
          const { data, error } = await supabase.from("knowledge_base").insert({
              titulo,
              conteudo,
              categoria: category || 'geral',
              embedding,
              ativo: true
          }).select();
          
          if (error) {
              results.push({ titulo, status: 'error', error: error.message });
          } else {
              results.push({ titulo, status: 'success' });
          }
      } else {
          results.push({ titulo, status: 'error', error: "Embedding failed" });
      }
  }

  return { success: true, processed: results };
});
