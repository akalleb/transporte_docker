# Product Requirements Document (PRD) - Transporte 2.0

## 1. Visão Geral do Produto
O **Transporte 2.0** é uma plataforma SaaS desenvolvida para otimizar a gestão de transporte em Secretarias de Saúde. O sistema visa centralizar o controle da frota, agendamento de viagens e comunicação via WhatsApp, garantindo eficiência operacional e transparência no uso dos recursos públicos.

### 1.1 Objetivos Principais
- **Centralização**: Unificar gestão de frota, motoristas e agendamentos em uma única plataforma.
- **Controle de Custos**: Monitorar manutenções preventivas e corretivas para reduzir gastos.
- **Comunicação Ágil**: Integrar atendimento via WhatsApp para solicitações e coordenação.
- **Segurança**: Controle de acesso baseado em funções (Admin/Usuário) e autenticação segura.

---

## 2. Público-Alvo
1.  **Gestores de Transporte**: Responsáveis pela alocação de veículos e aprovação de manutenções.
2.  **Administrativo da Saúde**: Solicitantes de transporte para pacientes e equipes.
3.  **Motoristas**: (Futuro) Visualização de escalas e registros de ocorrências.
4.  **Mecânicos/Oficinas**: (Indireto) Executores das manutenções registradas.

---

## 3. Especificações Funcionais

### 3.1 Módulo de Autenticação e Perfil
- **Login Seguro**: Autenticação via e-mail e senha (Supabase Auth).
- **Recuperação de Senha**: Fluxo completo de "Esqueci minha senha" e redefinição.
- **Perfil de Usuário**: Gestão de dados pessoais e alteração de senha.
- **Controle de Acesso**: Permissões diferenciadas para administradores e usuários comuns.

### 3.2 Módulo de Gestão de Frota (`/frota`)
- **Cadastro de Veículos**:
  - Dados: Marca, Modelo, Ano, Placa, Tipo (Carro, Ambulância, Van, Moto), Status (Disponível, Em Uso, Manutenção), Odômetro, Combustível.
  - Validações: Placa única, campos obrigatórios.
- **Gestão de Manutenções**:
  - Registro de manutenções preventivas e corretivas.
  - Dados: Data, Custo, Mecânico/Oficina, Descrição detalhada.
  - Histórico completo por veículo.
- **Dashboard de Frota**:
  - Estatísticas em tempo real: Total de veículos, Disponíveis, Em Manutenção.
  - Visualização rápida via barra de progresso.
- **Listagem e Filtros**: Busca por placa, modelo ou status; paginação.

### 3.3 Módulo de Atendimento (`/atendimento`)
- **Integração WhatsApp**:
  - Conexão via QR Code (biblioteca Baileys).
  - Gestão de múltiplas conversas.
  - Envio e recebimento de mensagens de texto e mídia.
- **Organização**:
  - Abas de conversas: "Ativas" (em atendimento) e "Finalizadas".
  - Histórico de mensagens persistente.

### 3.4 Módulo de Agenda (`/agenda`)
- **Agendamento de Viagens**: (Em desenvolvimento)
  - Solicitação de transporte para pacientes/equipes.
  - Vínculo com veículos e motoristas disponíveis.
  - Status do agendamento (Pendente, Confirmado, Concluído, Cancelado).

### 3.5 Configurações do Sistema (`/configuracoes`)
- **Ajustes Gerais**: Parâmetros globais da aplicação.
- **Gestão de Usuários**: (Admin) Criação e edição de usuários do sistema.

---

## 4. Arquitetura Técnica

### 4.1 Frontend
- **Framework**: Nuxt 3 (Vue 3 + Composition API).
- **Estilização**: Tailwind CSS (Design System personalizado).
- **Ícones**: Lucide Vue Next.
- **Gerenciamento de Estado**: Composables nativos do Nuxt (`useState`, `ref`).

### 4.2 Backend & Infraestrutura
- **BaaS**: Supabase.
  - **Database**: PostgreSQL.
  - **Auth**: Supabase Auth (JWT).
  - **Storage**: Supabase Storage (para anexos e mídias).
  - **Realtime**: Atualizações em tempo real para chat e status.
- **Microserviço WhatsApp**:
  - Servidor Node.js/Express independente (`/whatsapp-server`).
  - Biblioteca: Baileys.

### 4.3 Banco de Dados (Schema Simplificado)
- **`vehicles`**: Tabela principal de veículos.
- **`maintenance_records`**: Histórico de manutenções (FK: `vehicle_id`).
- **`system_settings`**: Configurações globais.
- **`profiles`**: Dados estendidos de usuários (vinculado a `auth.users`).

---

## 5. Requisitos Não Funcionais
- **Performance**: Carregamento rápido de listagens (paginação no backend).
- **Usabilidade**: Interface responsiva (Mobile/Desktop) e intuitiva.
- **Segurança**: RLS (Row Level Security) no Supabase para proteção de dados.
- **Confiabilidade**: Tratamento de erros robusto e feedback visual ao usuário.

---

## 6. Roadmap Futuro
- **App do Motorista**: Versão mobile simplificada para check-in/check-out de viagens.
- **Relatórios Avançados**: Gráficos de custos por km rodado e eficiência de combustível.
- **Geolocalização**: Rastreamento em tempo real dos veículos.
- **Notificações**: Alertas automáticos de manutenção preventiva baseada em km ou tempo.
