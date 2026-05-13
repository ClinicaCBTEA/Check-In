# 🚀 Guia de Deploy para Produção

Este guia contém instruções detalhadas para fazer deploy do Sistema de Fila de Atendimento CBTEA em produção.

## 📋 Pré-requisitos

Antes de iniciar o deploy, certifique-se de ter:

- ✅ Projeto Supabase criado e configurado
- ✅ Edge Function deployada no Supabase
- ✅ Build do frontend funcionando localmente (`pnpm build`)
- ✅ Domínio próprio (opcional, mas recomendado)
- ✅ Certificado SSL (HTTPS obrigatório para notificações)

## 🔧 Preparação

### 1. Configure as Variáveis de Ambiente

Certifique-se de que o arquivo `utils/supabase/info.tsx` exporta as credenciais corretas:

```typescript
export const projectId = 'seu-project-id';
export const publicAnonKey = 'sua-anon-key';
```

### 2. Build do Projeto

```bash
# Instale as dependências
pnpm install

# Crie a build de produção
pnpm build
```

O comando irá gerar a pasta `dist/` com os arquivos estáticos otimizados.

### 3. Deploy da Edge Function no Supabase

```bash
# Login no Supabase
supabase login

# Link com seu projeto
supabase link --project-ref <seu-project-id>

# Deploy da função
supabase functions deploy server

# Configure os secrets
supabase secrets set SUPABASE_URL=https://seu-project-id.supabase.co
supabase secrets set SUPABASE_ANON_KEY=sua-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

Verifique se a função está rodando:
```bash
supabase functions list
supabase functions logs server
```

## 🌐 Opções de Deploy do Frontend

### Opção 1: Vercel (Recomendado)

#### Via CLI
```bash
# Instale a CLI do Vercel
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### Via GitHub
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Importe seu repositório do GitHub
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist`
5. Clique em "Deploy"

**Configurações importantes:**
- Não há variáveis de ambiente necessárias no build (credenciais estão no código)
- Vercel detecta automaticamente Vite
- Deploy automático a cada push no GitHub

### Opção 2: Netlify

#### Via CLI
```bash
# Instale a CLI do Netlify
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

#### Via Interface Web
1. Acesse [netlify.com](https://netlify.com)
2. Clique em "Add new site" > "Import an existing project"
3. Conecte seu repositório GitHub
4. Configure:
   - **Build command:** `pnpm build`
   - **Publish directory:** `dist`
5. Clique em "Deploy site"

**Configuração de redirecionamento:**
Crie o arquivo `public/_redirects`:
```
/*  /index.html  200
```

### Opção 3: Render

1. Acesse [render.com](https://render.com)
2. Clique em "New +" > "Static Site"
3. Conecte seu repositório
4. Configure:
   - **Build Command:** `pnpm install && pnpm build`
   - **Publish Directory:** `dist`
5. Clique em "Create Static Site"

### Opção 4: Cloudflare Pages

```bash
# Instale Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# Deploy
wrangler pages deploy dist
```

### Opção 5: Servidor Próprio (VPS)

#### Com Nginx

1. **Faça build local e envie para o servidor:**
```bash
pnpm build
scp -r dist/* usuario@seu-servidor:/var/www/fila-cbtea
```

2. **Configure o Nginx:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    
    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;
    
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;
    
    root /var/www/fila-cbtea;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

3. **Obtenha certificado SSL (Let's Encrypt):**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

4. **Reinicie o Nginx:**
```bash
sudo systemctl restart nginx
```

## 🔐 Checklist de Segurança

Antes de colocar em produção, verifique:

- [ ] **HTTPS habilitado** (obrigatório para notificações)
- [ ] **Credenciais padrão alteradas** (admin/recepcao)
- [ ] **Service Role Key nunca exposta** no frontend
- [ ] **CORS configurado** corretamente na Edge Function
- [ ] **Rate limiting** habilitado (se disponível)
- [ ] **Logs de erro** configurados e monitorados
- [ ] **Backup do banco** de dados configurado

## 📊 Monitoramento

### Logs da Edge Function
```bash
# Ver logs em tempo real
supabase functions logs server --follow

# Ver últimos logs
supabase functions logs server
```

### Métricas do Supabase
1. Acesse o dashboard do Supabase
2. Vá em "Reports" para ver:
   - Requisições da API
   - Uso do banco de dados
   - Edge Functions invocações
   - Erros e latência

### Analytics do Frontend

Adicione Google Analytics ou Plausible para monitorar:
- Acessos por página
- Taxa de conversão (cadastros)
- Uso de notificações
- Dispositivos mais usados

## 🔄 Atualização em Produção

### 1. Atualizar Frontend
```bash
# Pull das mudanças
git pull origin main

# Build
pnpm install
pnpm build

# Deploy (dependendo da plataforma)
vercel --prod
# ou
netlify deploy --prod --dir=dist
```

### 2. Atualizar Edge Function
```bash
# Deploy nova versão
supabase functions deploy server

# Verificar logs
supabase functions logs server
```

### 3. Zero Downtime Deploy

A maioria das plataformas (Vercel, Netlify) faz deploy atômico automaticamente:
- Nova versão sobe em paralelo
- Só é ativada quando totalmente pronta
- Rollback automático em caso de erro

## 🧪 Testes em Produção

Após o deploy, teste:

1. **Fluxo do Paciente**
   - [ ] Cadastro funciona
   - [ ] QR Code carrega
   - [ ] Posição atualiza em tempo real
   - [ ] Notificações funcionam (pedir permissão)
   - [ ] Som toca quando chamado
   - [ ] Retornar à fila funciona

2. **Fluxo da Recepção**
   - [ ] Login funciona
   - [ ] Chamar próximo paciente
   - [ ] Concluir atendimento
   - [ ] Reordenar fila
   - [ ] Exportar Excel

3. **Fluxo Admin**
   - [ ] Login admin
   - [ ] Adicionar recepcionista
   - [ ] Alterar senha admin

4. **Performance**
   - [ ] Lighthouse score > 90
   - [ ] Tempo de carregamento < 3s
   - [ ] Funciona em mobile (iOS/Android)
   - [ ] Funciona em diferentes navegadores

## 🚨 Troubleshooting

### Notificações não funcionam em produção

**Causa:** Site não está em HTTPS  
**Solução:** Configure SSL/TLS no seu domínio

**Causa:** Service Worker bloqueado  
**Solução:** Verifique console do navegador, limpe cache

### Erro CORS

**Causa:** Edge Function não aceita origem do frontend  
**Solução:** Verifique configuração CORS em `supabase/functions/server/index.tsx`:
```typescript
app.use('*', cors({
  origin: '*', // Em produção, especifique seu domínio
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))
```

### Banco de dados não atualiza

**Causa:** Edge Function não está deployada ou secrets faltando  
**Solução:**
```bash
supabase functions deploy server
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<sua-key>
```

### Build falha

**Causa:** Dependências desatualizadas ou incompatíveis  
**Solução:**
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

## 📱 PWA (Progressive Web App) - Opcional

Para transformar em PWA instalável:

1. **Adicione manifest.json:**
```json
{
  "name": "CBTEA Fila de Atendimento",
  "short_name": "CBTEA Fila",
  "description": "Sistema de fila de atendimento",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#10b981",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

2. **Configure Vite para gerar Service Worker:**
```bash
pnpm add -D vite-plugin-pwa
```

Isso permitirá que usuários "instalem" o app no celular.

## 🎯 Checklist Final

Antes de considerar o deploy completo:

- [ ] Frontend deployado e acessível
- [ ] Edge Function rodando sem erros
- [ ] HTTPS configurado
- [ ] Domínio personalizado configurado (se aplicável)
- [ ] Credenciais padrão alteradas
- [ ] Testes em múltiplos dispositivos
- [ ] QR Code atualizado com URL de produção
- [ ] Logs e monitoramento configurados
- [ ] Backup configurado
- [ ] Documentação atualizada com URLs de produção

## 📞 Suporte

Se encontrar problemas durante o deploy:

1. Verifique os logs: `supabase functions logs server`
2. Verifique o console do navegador (F12)
3. Consulte a documentação:
   - Supabase: https://supabase.com/docs
   - Vercel: https://vercel.com/docs
   - Netlify: https://docs.netlify.com

---

**Boa sorte com o deploy! 🚀**
