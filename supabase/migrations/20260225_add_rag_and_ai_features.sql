-- Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela de base de conhecimento para RAG
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  categoria TEXT DEFAULT 'geral',
  embedding VECTOR(1024),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_base
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE OR REPLACE FUNCTION buscar_conhecimento(
  query_embedding VECTOR(1024),
  limite INT DEFAULT 4,
  similaridade_minima FLOAT DEFAULT 0.65
)
RETURNS TABLE(id UUID, titulo TEXT, conteudo TEXT, categoria TEXT, similaridade FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT id, titulo, conteudo, categoria,
    1 - (embedding <=> query_embedding) AS similaridade
  FROM knowledge_base
  WHERE ativo = true
    AND 1 - (embedding <=> query_embedding) > similaridade_minima
  ORDER BY embedding <=> query_embedding
  LIMIT limite;
$$;

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS transfer_reason TEXT,
ADD COLUMN IF NOT EXISTS transfer_summary TEXT,
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;
