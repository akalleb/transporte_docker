import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tenta carregar da raiz do projeto (../.env)
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

console.log('[EnvLoader] Tentando carregar .env de:', envPath);

if (result.error) {
    console.warn('[EnvLoader] Erro ao carregar .env:', result.error.message);
} else {
    console.log('[EnvLoader] .env carregado com sucesso!');
    // Verificar se a chave OpenRouter está presente
    if (process.env.OPENROUTER_API_KEY) {
        console.log('[EnvLoader] Chave OPENROUTER_API_KEY encontrada.');
    } else {
        console.warn('[EnvLoader] AVISO: Chave OPENROUTER_API_KEY NÃO encontrada no .env carregado!');
    }
}
