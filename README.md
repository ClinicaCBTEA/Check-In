# Sistema de Fila de Atendimento CBTEA

Sistema web completo para gerenciamento de fila de atendimento com notificações push, desenvolvido com React, TypeScript, Tailwind CSS e Supabase.

## 📋 Funcionalidades

### Para Pacientes
- ✅ Cadastro na fila via QR Code
- 📱 Acompanhamento da posição em tempo real
- 🔔 Notificações push quando chegar a vez
- 🔊 Alerta sonoro automático
- 📳 Vibração em dispositivos móveis
- ✨ Título da aba piscando quando chamado
- 🔄 Opção de retornar à fila após atendimento concluído

### Para Recepção
- 👥 Painel de gerenciamento de pacientes
- 🎯 Chamada do próximo paciente ou específico
- 📊 Visualização de status (Aguardando, Em Atendimento, Concluídos)
- ✅ Conclusão de atendimento
- 🔄 Devolução de pacientes à fila
- ⬆️ Reordenação de prioridade
- 📜 Log completo de atendimentos com exportação para Excel

### Para Administradores
- 👨‍💼 Gerenciamento de recepcionistas
- 🔐 Alteração de credenciais administrativas
- 🛡️ Autenticação segura

## 🚀 Tecnologias

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Tipagem estática
- **React Router** - Navegação
- **Tailwind CSS v4** - Estilização
- **Vite** - Build tool
- **Lucide React** - Ícones
- **QRCode.react** - Geração de QR Codes
- **SheetJS** - Exportação Excel

### Backend
- **Supabase** - Backend as a Service
  - Edge Functions (Hono framework)
  - PostgreSQL Database
  - Authentication
  - Storage (se necessário)

### APIs Web
- Notifications API - Push notifications
- Web Audio API - Sons de alerta
- Vibration API - Vibração mobile
- Service Worker API - Notificações em background

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- pnpm (gerenciador de pacotes)
- Conta Supabase (gratuita)
- Supabase CLI (para deploy das funções)

### 1. Clone o repositório
```bash
git clone <repository-url>
cd <project-folder>
```

### 2. Instale as dependências
```bash
pnpm install
```

### 3. Configure o Supabase

#### 3.1. Crie um projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote as credenciais: `Project URL` e `anon key`

#### 3.2. Configure as variáveis de ambiente
O projeto já está configurado para usar as variáveis do Supabase automaticamente via `utils/supabase/info.tsx`.

#### 3.3. Deploy da Edge Function
```bash
# Login no Supabase CLI
supabase login

# Link com seu projeto
supabase link --project-ref <seu-project-id>

# Deploy da função
supabase functions deploy server
```

#### 3.4. Configure os secrets da função
```bash
supabase secrets set SUPABASE_URL=<sua-url>
supabase secrets set SUPABASE_ANON_KEY=<sua-anon-key>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>
```

### 4. Inicie o servidor de desenvolvimento
```bash
pnpm dev
```

A aplicação estará disponível em `http://localhost:5173`

## 🏗️ Estrutura do Projeto

```
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── v2/              # Componentes da aplicação
│   │   │   │   ├── RegisterScreenV2.tsx
│   │   │   │   ├── QueuePositionScreenV2.tsx
│   │   │   │   ├── ReceptionScreenV2.tsx
│   │   │   │   ├── LoginScreenV2.tsx
│   │   │   │   ├── AdminPanelV2.tsx
│   │   │   │   └── ...
│   │   │   └── ui/              # Componentes UI reutilizáveis
│   │   ├── context/             # Context API
│   │   │   ├── SimpleQueueContext.tsx
│   │   │   ├── AuthContext.tsx
│   │   │   └── UserManagementContext.tsx
│   │   ├── routes.tsx           # Configuração de rotas
│   │   └── App.tsx              # Componente raiz
│   ├── utils/
│   │   ├── api.ts               # Cliente API
│   │   ├── notifications.ts     # Utilitários de notificação
│   │   └── supabase/
│   │       └── info.ts          # Configuração Supabase
│   ├── imports/                 # Assets (imagens, SVGs)
│   └── styles/                  # Estilos globais
├── supabase/
│   └── functions/
│       └── server/              # Edge Function (Backend)
│           ├── index.tsx        # Servidor Hono com todas as rotas
│           └── kv_store.tsx     # Utilitários de KV store
├── NOTIFICATIONS_GUIDE.md       # Guia de notificações
└── DEPLOY.md                    # Guia de deploy
```

## 🔐 Credenciais Padrão

### Recepção
- **Usuário:** `recepcao`
- **Senha:** `cbtea2024`

### Administrador
- **Usuário:** `admin`
- **Senha:** `admin123`

⚠️ **IMPORTANTE:** Altere essas credenciais em produção através do painel administrativo!

## 🌐 Deploy em Produção

Consulte o arquivo [DEPLOY.md](./DEPLOY.md) para instruções detalhadas de deploy.

### Opções de Deploy
1. **Figma Make** (Recomendado para protótipos)
2. **Vercel** (Recomendado para produção)
3. **Netlify**
4. **Render**
5. **Servidor próprio** (VPS)

## 📱 Uso do Sistema

### Fluxo do Paciente
1. Escanear QR Code ou acessar URL
2. Preencher cadastro (nome e telefone)
3. Permitir notificações (opcional mas recomendado)
4. Aguardar na tela de posição
5. Receber notificação quando for chamado
6. Após atendimento, opção de retornar à fila

### Fluxo da Recepção
1. Login com credenciais
2. Visualizar painel com estatísticas
3. Chamar próximo paciente ou específico
4. Concluir atendimento
5. Gerenciar fila (reordenar, devolver)

### Fluxo Administrativo
1. Login administrativo
2. Adicionar/remover recepcionistas
3. Alterar credenciais de admin
4. Gerenciar usuários do sistema

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Preview da build
pnpm preview

# Deploy Supabase function
supabase functions deploy server

# Logs da function em produção
supabase functions logs server

# Verificar tipos TypeScript
pnpm type-check
```

## 🐛 Troubleshooting

### Notificações não funcionam
- Verifique se o navegador suporta notificações
- Confirme que a permissão foi concedida
- Em produção, certifique-se de usar HTTPS
- Verifique se "Não perturbe" está desativado

### Erro 500 no servidor
- Verifique os logs: `supabase functions logs server`
- Confirme que os secrets estão configurados
- Verifique se a função foi deployada: `supabase functions list`

### Dados não sincronizam
- Verifique a conexão com internet
- Confirme que as credenciais Supabase estão corretas
- Verifique o console do navegador para erros

### Build falha
- Limpe node_modules: `rm -rf node_modules && pnpm install`
- Limpe cache do Vite: `rm -rf .vite`
- Verifique se todas as dependências estão instaladas

## 📄 Documentação Adicional

- [NOTIFICATIONS_GUIDE.md](./NOTIFICATIONS_GUIDE.md) - Guia completo de notificações push
- [DEPLOY.md](./DEPLOY.md) - Instruções detalhadas de deploy

## 🤝 Contribuindo

1. Faça fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT.

## 👥 Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Consulte a documentação do Supabase: https://supabase.com/docs
- Consulte a documentação do React Router: https://reactrouter.com

## 🎯 Roadmap

- [ ] Notificação quando faltam X pessoas na fila
- [ ] Customização de som de notificação
- [ ] Suporte a PWA (Progressive Web App)
- [ ] Estatísticas de uso de notificações
- [ ] Modo escuro
- [ ] Múltiplas filas/especialidades
- [ ] Integração com WhatsApp
- [ ] Painel de métricas e analytics
