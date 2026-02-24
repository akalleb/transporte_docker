# Guia de Implantação no Hostinger VPS com Docker

Este guia explica como implantar a aplicação (Frontend Nuxt + Servidor WhatsApp + Banco de Dados) em um VPS da Hostinger usando Docker.

## Pré-requisitos

1.  Um VPS com Linux (Ubuntu 20.04 ou 22.04 recomendado).
2.  Acesso SSH ao VPS.
3.  Docker e Docker Compose instalados no VPS.

## Instalação do Docker no VPS

Se o Docker ainda não estiver instalado, execute os seguintes comandos no terminal do VPS:

```bash
# Atualizar pacotes
sudo apt update
sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose (versão plugin)
sudo apt install docker-compose-plugin -y
```

## Passo a Passo da Implantação

### 1. Transferir os Arquivos

Você pode clonar seu repositório git ou enviar os arquivos via SFTP/SCP. Certifique-se de enviar os seguintes arquivos/pastas:
- `app/`
- `whatsapp-server/`
- `docker-compose.yml`
- `Dockerfile`
- `package.json` e `package-lock.json`
- `nuxt.config.ts` e outros arquivos de configuração na raiz.

### 2. Configurar Variáveis de Ambiente

No servidor, crie um arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
nano .env
```

Edite o arquivo `.env` com suas configurações reais:

*   **SUPABASE_URL**, **SUPABASE_KEY**, **SUPABASE_SERVICE_ROLE_KEY**: Mantenha as chaves do seu projeto Supabase existente.
*   **APP_PORT** e **WHATSAPP_PORT**: Defina as portas externas do VPS (padrão: 3000 e 3001). Se estiverem ocupadas, altere aqui (ex: 8080 e 8081).
*   **WHATSAPP_API_URL**: Coloque o IP do seu VPS ou domínio, seguido da porta definida em `WHATSAPP_PORT`.
    *   Exemplo: `http://123.456.78.90:3001` (ou a porta que você escolheu).
*   **CORS_ORIGIN**: Coloque a URL onde o frontend estará acessível (IP/Domínio + `APP_PORT`).
    *   Exemplo: `http://123.456.78.90:3000` (ou a porta que você escolheu).

### 3. Iniciar a Aplicação

Na pasta do projeto, execute:

```bash
sudo docker compose up -d --build
```

Isso irá:
1.  Construir a imagem do Frontend Nuxt.
2.  Construir a imagem do Servidor WhatsApp.
3.  Baixar e iniciar o PostgreSQL.
4.  Iniciar todos os contêineres em segundo plano.

### 4. Verificar Status

```bash
sudo docker compose ps
```

Se tudo estiver correto, você verá 3 serviços rodando (`app`, `whatsapp-server`, `db`).

Acesse no navegador: `http://SEU_IP_VPS:3000`

## Migração de Banco de Dados (Supabase -> Postgres Local)

Atualmente, a aplicação está configurada para continuar usando o Supabase Cloud para Autenticação e Dados, garantindo que tudo funcione imediatamente.

O arquivo `docker-compose.yml` já inclui um serviço `db` (PostgreSQL) pronto para uso. Se você deseja migrar totalmente seus dados do Supabase para este banco local, siga estes passos gerais:

1.  **Exportar Dados**: Use `pg_dump` para exportar os dados do seu banco Supabase.
2.  **Importar Dados**: Importe o dump para o contêiner `db`.
    ```bash
    cat backup.sql | docker compose exec -T db psql -U postgres -d app_db
    ```
3.  **Atualizar Aplicação**: A migração completa requer alterações profundas no código, pois o projeto utiliza a biblioteca `@nuxtjs/supabase` que depende dos serviços de Autenticação e Realtime do Supabase. Para usar apenas o Postgres local, você precisaria:
    *   Substituir `@nuxtjs/supabase` por uma solução como `Prisma` ou `Drizzle ORM`.
    *   Implementar seu próprio sistema de autenticação (ex: NextAuth/Auth.js).
    *   Self-host do Supabase (opção alternativa complexa).

Por enquanto, recomenda-se manter o Supabase Cloud conectado.

## Notas de Segurança

*   Certifique-se de configurar o Firewall do VPS para permitir as portas 3000, 3001 e 5432 (se necessário acesso externo ao banco).
*   Para produção, recomenda-se configurar um **Nginx** como Proxy Reverso para usar HTTPS (Porta 443) e encaminhar para as portas 3000/3001 internamente.
