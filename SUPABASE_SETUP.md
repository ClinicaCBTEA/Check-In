# Setup do Supabase

## Projeto atual

- Project ref: `vfcneroahkdbeszcjiwk`
- URL: `https://vfcneroahkdbeszcjiwk.supabase.co`
- Publishable key: `sb_publishable_uBk92iWb5YnKtOkfpFNR8w_WpdUvr9R`

## O que o Supabase faz neste projeto

O Supabase aqui nao e so banco de dados:

- PostgreSQL: guarda a fila e as credenciais na tabela `kv_store_d5bb9c63`
- Edge Function: expõe a API HTTP em `/functions/v1/server/*`
- Secrets: armazenam `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` para o backend

## O que ainda falta para deploy real

Voce ainda vai precisar de:

- um `SUPABASE_ACCESS_TOKEN` para usar o Supabase CLI em deploy remoto
- senha real do Postgres no lugar de `[YOUR-PASSWORD]`, se quiser usar `psql` ou `db push`

## Comandos

### 1. Login e link

```powershell
.\scripts\supabase.cmd login
.\scripts\supabase.cmd link --project-ref vfcneroahkdbeszcjiwk
```

### 2. Configurar secrets da function

Na hospedagem do Supabase, a Edge Function ja recebe por padrao:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEYS`
- `SUPABASE_SECRET_KEYS`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Ou seja: para este projeto, normalmente voce **nao precisa** cadastrar manualmente a `service_role` nem a `sb_secret` so para a function acessar o proprio projeto.

Use secrets manuais apenas se quiser sobrescrever o comportamento padrao.

```powershell
.\scripts\supabase.cmd secrets set SUPABASE_URL=https://vfcneroahkdbeszcjiwk.supabase.co
.\scripts\supabase.cmd secrets set SUPABASE_SERVICE_ROLE_KEY=<SUA_SERVICE_ROLE_KEY>
```

### 3. Criar a tabela do projeto

Opcao A: pelo SQL Editor do Supabase, rode o arquivo:

- `supabase/migrations/20260513104500_create_kv_store.sql`

Opcao B: se o projeto estiver linkado:

```powershell
.\scripts\supabase.cmd db push
```

### 4. Deploy da Edge Function

```powershell
.\scripts\supabase.cmd functions deploy server
```

### 5. Teste de saude

```text
https://vfcneroahkdbeszcjiwk.supabase.co/functions/v1/server/health
```

## Observacao importante sobre a chave publishable

Este projeto foi ajustado para usar o header `apikey` no frontend.
Com chaves `sb_publishable_...`, a function `server` precisa estar com `verify_jwt = false`.

Como o Supabase nao valida automaticamente esse `apikey` em Edge Functions com `verify_jwt = false`, o proprio codigo da function agora faz a validacao do header `apikey`.
