# WhatsApp Server (Baileys)

Este é o servidor Node.js responsável por conectar ao WhatsApp e enviar/receber mensagens.

## Instalação

```bash
npm install
```

## Configuração

1. Abra o arquivo `server.js`
2. Configure `SUPABASE_ANON_KEY` com sua chave pública do Supabase.

## Como rodar

```bash
node server.js
```

Ao rodar pela primeira vez, um QR Code aparecerá no terminal. Escaneie com seu WhatsApp (Dispositivos Conectados).

As credenciais serão salvas na pasta `auth`.
