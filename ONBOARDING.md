# 👋 Onboarding - Sistema de Fila CBTEA

Bem-vindo ao projeto! Este guia irá te colocar em operação rapidamente.

## 🎯 O Que é Este Projeto?

Sistema web completo para gerenciar fila de atendimento em clínicas/hospitais com:
- Pacientes entram na fila via QR Code
- Recebem notificações push quando chegar sua vez
- Recepção gerencia a fila em tempo real
- Tudo sincronizado via Supabase

## ⚡ Quick Start (5 minutos)

### 1. Clone e Instale
```bash
git clone <url-do-repositorio>
cd sistema-fila-cbtea
pnpm install
```

### 2. Configure o Supabase

Você precisará de um projeto Supabase (gratuito). Já deve ter sido criado, peça as credenciais:

- `SUPABASE_URL` (ex: https://xxxxx.supabase.co)
- `SUPABASE_ANON_KEY` (chave pública)
- `SUPABASE_SERVICE_ROLE_KEY` (chave privada - apenas para backend)

### 3. Atualize as Credenciais

Edite: `utils/supabase/info.tsx`
```typescript
export const projectId = 'seu-project-id'; // pegar do URL
export const publicAnonKey = 'sua-anon-key';
```

### 4. Rode Local
```bash
pnpm dev
```

Acesse: http://localhost:5173

### 5. Teste
- **Tela inicial:** Cadastro de paciente
- **Login recepção:** usuário: `recepcao` / senha: `cbtea2024`
- **Login admin:** usuário: `admin` / senha: `admin123`

## 🏗️ Arquitetura

```
┌─────────────────┐
│   Frontend      │  React + TypeScript + Tailwind
│   (Vite)        │  Roda em: Vercel/Netlify
└────────┬────────┘
         │
         │ HTTPS
         │
┌────────▼────────┐
│ Supabase Edge   │  Hono framework (Node-like)
│ Function        │  Endpoint: /functions/v1/server/*
└────────┬────────┘
         │
         │ PostgreSQL
         │
┌────────▼────────┐
│   Database      │  Key-Value Store (kv_store_d5bb9c63)
│   (Postgres)    │  Armazena: fila, usuários, logs
└─────────────────┘
```

## 📂 Estrutura de Pastas Importantes

```
src/
├── app/
│   ├── components/v2/      ← TELAS PRINCIPAIS
│   │   ├── RegisterScreenV2.tsx        (Cadastro paciente)
│   │   ├── QueuePositionScreenV2.tsx   (Posição na fila)
│   │   ├── ReceptionScreenV2.tsx       (Painel recepção)
│   │   ├── AdminPanelV2.tsx            (Painel admin)
│   │   └── LoginScreenV2.tsx           (Login recepção)
│   │
│   ├── context/            ← GERENCIAMENTO DE ESTADO
│   │   ├── SimpleQueueContext.tsx      (Lógica da fila)
│   │   ├── AuthContext.tsx             (Autenticação)
│   │   └── UserManagementContext.tsx   (Usuários)
│   │
│   └── routes.tsx          ← ROTAS DO APP
│
├── utils/
│   ├── api.ts              ← CLIENTE API (fetch ao backend)
│   └── notifications.ts    ← PUSH NOTIFICATIONS
│
└── imports/                ← IMAGENS/LOGOS

supabase/functions/server/
├── index.tsx               ← BACKEND (Edge Function)
└── kv_store.tsx            ← Utilitários de banco
```

## 🔑 Principais Conceitos

### 1. Fila de Pacientes

Estado de um paciente:
- `waiting` → Na fila aguardando
- `in-service` → Sendo atendido agora
- `completed` → Atendimento finalizado

### 2. Fluxo do Paciente
```
[Cadastro] → [Aguardando] → [Notificação] → [Atendimento] → [Concluído]
```

### 3. Fluxo da Recepção
```
[Login] → [Ver Fila] → [Chamar Paciente] → [Concluir Atendimento]
```

### 4. API Backend (Supabase Edge Function)

Todas as operações passam pela Edge Function:

```typescript
// Exemplo de chamada
import { fetchQueue, addPatientToQueue } from '@/utils/api';

// Buscar fila
const queue = await fetchQueue();

// Adicionar paciente
const patientId = await addPatientToQueue('João Silva', '(11) 99999-9999');
```

Endpoints principais:
- `GET /queue` - Lista todos pacientes
- `POST /queue` - Adiciona paciente
- `PUT /queue/:id` - Atualiza paciente
- `DELETE /queue/:id` - Remove paciente
- `POST /receptionists/validate` - Login recepção
- `POST /admin/validate` - Login admin

## 🎨 Stack Tecnológico

| Camada | Tecnologia | Propósito |
|--------|-----------|-----------|
| **Frontend** | React 18 | UI framework |
| | TypeScript | Type safety |
| | Tailwind CSS v4 | Estilização |
| | React Router | Navegação |
| | Vite | Build tool |
| **Backend** | Supabase Edge Functions | Serverless API |
| | Hono | Web framework |
| | PostgreSQL | Banco de dados |
| **Deploy** | Vercel/Netlify | Frontend hosting |
| | Supabase | Backend hosting |

## 🚀 Comandos Essenciais

```bash
# Desenvolvimento
pnpm dev              # Roda app local (http://localhost:5173)
pnpm build            # Build para produção
pnpm preview          # Preview da build

# Backend (Supabase)
supabase functions deploy server    # Deploy Edge Function
supabase functions logs server       # Ver logs do backend
supabase secrets list                # Ver secrets configurados
```

## 🧪 Como Testar

### Teste Local Completo

1. **Abra 3 abas do navegador:**
   - Aba 1: http://localhost:5173 (Paciente 1)
   - Aba 2: http://localhost:5173 (Paciente 2)
   - Aba 3: http://localhost:5173/login (Recepção)

2. **Nas abas de paciente:**
   - Cadastre "João Silva" com tel (11) 99999-9999
   - Cadastre "Maria Santos" com tel (11) 88888-8888
   - Permita notificações quando pedir

3. **Na aba de recepção:**
   - Login: `recepcao` / `cbtea2024`
   - Veja os 2 pacientes na fila
   - Clique em "Chamar Próximo"
   - João deve receber notificação! 🔔

4. **Verifique:**
   - ✅ Notificação push apareceu?
   - ✅ Som tocou?
   - ✅ Título da aba piscou?
   - ✅ Status mudou para "Em Atendimento"?

## 🐛 Troubleshooting Comum

### Problema: Erro "Failed to fetch"

**Causa:** Backend não está rodando ou credenciais erradas

**Solução:**
```bash
# Verifique se Edge Function está deployada
supabase functions list

# Veja os logs
supabase functions logs server
```

### Problema: Notificações não funcionam

**Causa:** Permissão negada ou navegador não suporta

**Solução:**
- Verifique se permitiu notificações
- Use Chrome/Edge (melhor suporte)
- HTTPS é obrigatório em produção (localhost funciona)

### Problema: Build falha

**Causa:** Dependências desatualizadas

**Solução:**
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

## 📚 Documentação Completa

- **[README.md](./README.md)** - Visão geral e instalação
- **[DEPLOY.md](./DEPLOY.md)** - Deploy para produção
- **[NOTIFICATIONS_GUIDE.md](./NOTIFICATIONS_GUIDE.md)** - Detalhes de notificações
- **[GITHUB_SETUP.md](./GITHUB_SETUP.md)** - Criar repositório GitHub

## 🔐 Segurança

⚠️ **NUNCA exponha estas variáveis:**
- `SUPABASE_SERVICE_ROLE_KEY` → Só no backend!
- `SUPABASE_SECRET_KEYS` → Só no backend!

✅ **OK expor:**
- `SUPABASE_URL` → Público
- `SUPABASE_ANON_KEY` → Público

## 📞 Próximos Passos

1. ✅ **Rode local** e entenda o fluxo
2. ✅ **Leia o código** das telas principais
3. ✅ **Teste as notificações**
4. ✅ **Faça deploy** seguindo DEPLOY.md
5. ✅ **Customize** conforme necessidade

## 💡 Dicas de Desenvolvimento

### Hot Reload
Vite tem hot reload automático. Edite qualquer arquivo `.tsx` e veja a mudança instantânea.

### Debug Menu
Em desenvolvimento, há um botão roxo de debug no canto inferior direito. Use para:
- Navegar entre telas
- Adicionar pacientes mock
- Ver status da fila

### Console Logs
Toda operação importante loga no console. Abra DevTools (F12) e veja:
```
Queue updated: [...] 
Notification permission: granted
Patient added successfully
```

### React DevTools
Instale a extensão React DevTools para inspecionar componentes e contextos.

## 🎓 Recursos de Aprendizado

Se você é novo em alguma tecnologia:

- **React:** https://react.dev/learn
- **TypeScript:** https://www.typescriptlang.org/docs/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Supabase:** https://supabase.com/docs
- **Vite:** https://vitejs.dev/guide/

## ✅ Checklist: Estou Pronto?

Antes de fazer mudanças, confirme:

- [ ] Consegui rodar `pnpm dev` sem erros
- [ ] Vi a tela de cadastro aparecer
- [ ] Consegui fazer login na recepção
- [ ] Entendi a estrutura de pastas
- [ ] Li o README.md principal
- [ ] Sei onde está a documentação das notificações

Se marcou tudo, você está pronto! 🚀

---

**Bem-vindo ao time! Se tiver dúvidas, consulte a documentação ou abra uma issue no GitHub.**
