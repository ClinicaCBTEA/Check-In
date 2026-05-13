# 🔔 Guia de Notificações Push

## Visão Geral

A aplicação agora possui **notificações push** para avisar pacientes quando for a vez deles no atendimento.

## Funcionalidades

### 1. **Notificação Visual (Push Notification)**
Quando o status do paciente muda para "Em Atendimento":
- Uma notificação aparece no navegador
- Funciona mesmo quando a aba não está ativa
- Persiste até o usuário visualizar
- Requer permissão do usuário

### 2. **Notificação Sonora**
- Som de beep automático quando é chamado
- Usa Web Audio API
- Funciona sem necessidade de permissão

### 3. **Título da Aba Piscando**
- Quando a aba não está ativa, o título pisca: "🔔 É SUA VEZ!"
- Para quando o usuário volta para a aba
- Funciona sem permissão

### 4. **Vibração (Mobile)**
- Em dispositivos móveis compatíveis, o dispositivo vibra
- Padrão: vibra 200ms, pausa 100ms, vibra 200ms

## Como Funciona

### Fluxo do Usuário

1. **Paciente entra na fila** → Navegador solicita permissão para notificações
2. **Paciente pode aceitar ou negar** → Status é salvo
3. **Paciente aguarda** → Indicador mostra se notificações estão habilitadas
4. **Chegou a vez** → Todas as notificações disparam automaticamente:
   - 🔔 Push notification
   - 🔊 Som de beep
   - 📱 Vibração (mobile)
   - ✨ Título piscando

### Estados de Permissão

#### ✅ Habilitado (granted)
- Badge verde: "Notificações habilitadas ✓"
- Todas as notificações funcionam

#### ⚠️ Pendente (default)
- Botão amarelo: "Habilitar Notificações"
- Clicando, solicita permissão novamente

#### ❌ Bloqueado (denied)
- Badge laranja: "Notificações bloqueadas"
- Instruções para habilitar manualmente

## Compatibilidade

### ✅ Suportado
- Chrome/Edge (Desktop & Mobile)
- Firefox (Desktop & Mobile)
- Safari (macOS 16+, iOS 16.4+)
- Opera
- Samsung Internet

### ⚠️ Limitações
- **iOS Safari (< 16.4)**: Notificações não suportadas
- **Modo incógnito**: Pode bloquear notificações automaticamente
- **Desktop**: Requer permissão do sistema operacional também

## Como Habilitar Manualmente

### Chrome/Edge
1. Clique no ícone de cadeado na barra de endereço
2. Configurações do site → Notificações
3. Alterar para "Permitir"

### Firefox
1. Clique no ícone de informações (ℹ️) na barra de endereço
2. Permissões → Notificações
3. Alterar para "Permitir"

### Safari
1. Safari → Configurações → Sites
2. Notificações → Localizar o site
3. Alterar para "Permitir"

## Recursos Implementados

### Código Principal
- **`src/utils/notifications.ts`** - Funções utilitárias para notificações
- **`src/app/components/v2/QueuePositionScreenV2.tsx`** - Lógica de detecção e disparo

### Funções Disponíveis

```typescript
// Solicitar permissão
requestNotificationPermission(): Promise<NotificationPermission>

// Mostrar notificação
showNotification(title: string, options?: NotificationOptions): Notification | null

// Verificar suporte
isNotificationSupported(): boolean

// Obter permissão atual
getNotificationPermission(): NotificationPermission

// Tocar som
playNotificationSound(): void
```

## Configuração de Notificação

A notificação é disparada com as seguintes opções:

```javascript
{
  body: 'Por favor, dirija-se ao atendimento agora.',
  icon: '/src/imports/image.png',          // Logo CBTEA
  badge: '/src/imports/image.png',         // Ícone pequeno
  tag: 'queue-notification',               // ID único (substitui notificações antigas)
  requireInteraction: true,                // Notificação persiste até clicar
  vibrate: [200, 100, 200]                 // Padrão de vibração
}
```

## Detecção de Mudança de Status

A aplicação monitora mudanças de status em tempo real:

```typescript
// Detecta quando status muda de 'waiting' para 'in-service'
if (previousStatus !== 'in-service' && currentStatus === 'in-service') {
  // Dispara todas as notificações
}
```

## Privacidade e Segurança

✅ **Sem tracking**: Notificações são locais, nenhum dado enviado para servidores externos
✅ **Controle do usuário**: Usuário decide se quer habilitar ou não
✅ **Sem spam**: Apenas uma notificação por vez (tag única)
✅ **Sem dados sensíveis**: Mensagem genérica, sem informações pessoais

## Troubleshooting

### Notificações não aparecem

**Verifique:**
1. ✅ Permissão concedida no navegador?
2. ✅ Permissões do sistema operacional habilitadas?
3. ✅ Modo "Não perturbe" desativado?
4. ✅ Navegador atualizado?

### Som não toca

**Possíveis causas:**
- Navegador bloqueia áudio sem interação do usuário
- Volume do dispositivo baixo/mutado
- Navegador em modo silencioso

### Vibração não funciona (Mobile)

**Possíveis causas:**
- Dispositivo sem suporte a Vibration API
- Modo silencioso ativado
- Economia de bateria ativa

## Boas Práticas

1. ✅ **Sempre informar o usuário** sobre o que as notificações fazem
2. ✅ **Solicitar permissão no momento certo** (quando entrar na fila)
3. ✅ **Oferecer alternativas** (som, título piscando) para quem negou permissão
4. ✅ **Não ser intrusivo** - uma notificação por evento
5. ✅ **Testar em diferentes dispositivos** antes de publicar

## Próximas Melhorias Sugeridas

- [ ] Notificação quando faltam X pessoas na fila
- [ ] Customizar som de notificação
- [ ] Suporte a Service Workers para notificações quando app está fechado
- [ ] Estatísticas de quantos usuários habilitam notificações
- [ ] Lembretes periódicos se usuário demorar muito para chegar

## Referências

- [MDN - Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [MDN - Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
- [MDN - Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Can I Use - Notifications](https://caniuse.com/notifications)
