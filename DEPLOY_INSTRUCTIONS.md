# 📡 Instruções para Deploy do Servidor Supabase

## ⚠️ Importante

Para que a aplicação funcione com múltiplos usuários em tempo real, você precisa **implantar o Edge Function do Supabase**.

**🔄 IMPORTANTE:** Sempre que o código do servidor for atualizado (arquivo `supabase/functions/server/index.tsx`), você precisa fazer o **re-deploy** do Edge Function para que as mudanças entrem em vigor!

## 🚀 Como Implantar

### Opção 1: Através do Painel do Make (Recomendado)

1. Clique no ícone de **configurações (⚙️)** no canto superior direito do Make
2. Procure pela seção **"Supabase"** ou **"Backend"**
3. Clique no botão **"Deploy Edge Function"** ou **"Implantar Servidor"**
4. Aguarde a confirmação de que o deploy foi concluído

### Opção 2: Manualmente via Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto: `ziuhtwnermhsjoirtdzy`
3. No menu lateral, vá em **"Edge Functions"**
4. Procure pela função `server`
5. Clique em **"Deploy"**

## ✅ Como Verificar se Está Funcionando

Após o deploy, você verá:

- ✅ Um indicador verde "Conectado" no canto superior direito da aplicação
- ✅ Os dados da fila sendo sincronizados entre diferentes dispositivos
- ✅ Não haverá mais erros de "Failed to fetch" no console

## 🔍 Testando a Conexão

Você pode testar manualmente acessando esta URL no navegador:

```
https://ziuhtwnermhsjoirtdzy.supabase.co/functions/v1/server/health
```

Se estiver funcionando, você verá:
```json
{"status":"ok"}
```

## 📊 Endpoints Disponíveis

A API possui os seguintes endpoints:

### Fila de Pacientes
- `GET /queue` - Buscar todos os pacientes
- `POST /queue` - Adicionar paciente
- `PUT /queue/:id` - Atualizar paciente
- `DELETE /queue/:id` - Remover paciente
- `GET /current-patient` - Buscar paciente atual
- `POST /current-patient` - Definir paciente atual

### Recepcionistas
- `GET /receptionists` - Buscar todos os recepcionistas
- `POST /receptionists` - Adicionar recepcionista
- `DELETE /receptionists/:id` - Remover recepcionista
- `POST /receptionists/validate` - Validar login

### Administração
- `GET /admin/credentials` - Buscar credenciais admin
- `PUT /admin/credentials` - Atualizar credenciais admin
- `POST /admin/validate` - Validar login admin

## 🐛 Problemas Comuns

### Erro: "Failed to fetch"
**Solução:** O Edge Function não está deployado. Siga as instruções acima.

### Erro: "CORS policy"
**Solução:** O servidor já está configurado com CORS aberto. Se ainda assim houver erro, verifique se o Edge Function foi deployado corretamente.

### Dados não sincronizam
**Solução:** Verifique se o indicador de conexão está verde. Se não estiver, faça o deploy novamente.

## 💡 Dicas

- A sincronização acontece automaticamente a cada 3 segundos
- Você pode abrir a aplicação em múltiplos dispositivos/navegadores para testar
- Todos os dados são persistidos no banco de dados Supabase
- Os dados iniciais (admin e recepcionista padrão) são criados automaticamente
