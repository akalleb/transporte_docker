import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tenta carregar da raiz do projeto (../../.env)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
console.log('Carregando .env de:', path.resolve(__dirname, '../../.env'));

// Ajuste para usar a chave correta do .env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const BASE_CONHECIMENTO = [
  {
    titulo: "Horário de Atendimento",
    categoria: "politicas",
    conteudo: "Nosso horário de atendimento para agendamentos é de segunda a sexta-feira, das 08:00 às 18:00. Não funcionamos aos finais de semana e feriados para novos agendamentos, mas o transporte agendado ocorre normalmente."
  },
  {
    titulo: "Serviços Disponíveis",
    categoria: "servicos",
    conteudo: "Oferecemos transporte para pacientes em tratamento de saúde. Realizamos transporte para: Consultas Médicas, Exames Laboratoriais, Fisioterapia, Hemodiálise e Tratamentos Contínuos. Atendemos pacientes com mobilidade reduzida e cadeirantes (avisar com antecedência)."
  },
  {
    titulo: "Como Agendar",
    categoria: "servicos",
    conteudo: "Para agendar, precisamos do seu Nome Completo, Telefone, Tipo de Procedimento (Consulta/Exame), Data e Horário, Local (Clínica/Hospital) e se precisa de acompanhante. O agendamento deve ser feito com pelo menos 24 horas de antecedência."
  },
  {
    titulo: "Preços e Valores",
    categoria: "precos",
    conteudo: "O transporte é gratuito para pacientes cadastrados no programa municipal de saúde. Para particulares, consulte nossa tabela enviando uma mensagem para o setor financeiro ou ligue para (11) 9999-9999."
  },
  {
    titulo: "Localização",
    categoria: "localizacao",
    conteudo: "Nossa sede fica na Rua das Flores, 123, Centro. Ponto de referência: Ao lado do Mercado Central. Link do Maps: https://maps.google.com/?q=TransporteSaude"
  },
  {
    titulo: "Acompanhantes",
    categoria: "politicas",
    conteudo: "É permitido 1 acompanhante por paciente nos seguintes casos: Idosos acima de 60 anos, Crianças, Pessoas com Deficiência (PCD) ou mediante declaração médica de necessidade."
  },
  {
    titulo: "Cancelamento",
    categoria: "politicas",
    conteudo: "Para cancelar, avise com no mínimo 4 horas de antecedência. O não comparecimento sem aviso prévio pode gerar suspensão do benefício por 30 dias."
  },
  {
    titulo: "Perguntas Frequentes",
    categoria: "faq",
    conteudo: "P: Buscam em casa? R: Sim, buscamos no endereço cadastrado. P: Posso levar bagagem? R: Apenas bolsa de mão. P: Aceita pet? R: Apenas cão-guia."
  }
];

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

async function indexarTudo() {
  console.log(`Indexando ${BASE_CONHECIMENTO.length} documentos...`);

  for (const doc of BASE_CONHECIMENTO) {
    const embedding = await gerarEmbedding(`${doc.titulo}\n\n${doc.conteudo}`);

    if (embedding) {
        const { error } = await supabase.from("knowledge_base").insert({
        titulo: doc.titulo,
        conteudo: doc.conteudo,
        categoria: doc.categoria,
        embedding
        });

        console.log(error ? `❌ ${doc.titulo}: ${error.message}` : `✅ ${doc.titulo}`);
    } else {
        console.log(`⏩ ${doc.titulo}: Pulado (erro no embedding ou API indisponível)`);
    }
    
    // Rate limit friendly
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("🎉 Concluído!");
}

indexarTudo();
