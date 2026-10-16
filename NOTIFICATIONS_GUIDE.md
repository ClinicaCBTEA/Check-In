# Alertas do sistema

O sistema usa notificações do navegador para avisar a recepção sobre novos check-ins e o paciente quando chega sua vez. Esses alertas dependem da página aberta; não são notificações push entregues com o navegador fechado.

## Recepção: novo check-in

- O painel consulta a fila a cada cinco segundos e compara os check-ins recebidos com a fila já carregada.
- Um novo check-in toca um aviso sonoro. Com a permissão do site concedida, também aparece uma notificação do navegador.
- Os pacientes que já estavam na fila quando o painel carregou não geram avisos retroativos.
- A recepção precisa estar autenticada e manter o painel aberto. Em segundo plano, o navegador pode reduzir a frequência das atualizações.
- Se a fila deixar de atualizar, o painel mostra o erro da API e oferece a opção de tentar novamente.

Para ativar a notificação do navegador, clique em **Ativar notificações** no painel da recepção e permita o acesso para o site.

## Paciente: chegou sua vez

A página de acompanhamento consulta o status a cada cinco segundos. Quando detecta a mudança para **Em Atendimento**, toca um aviso sonoro e mostra uma notificação se o paciente autorizou o site. O paciente pode conceder a permissão no botão **Habilitar Notificações** da tela de acompanhamento.

O paciente deve manter essa página aberta até o atendimento. O sistema não envia SMS, WhatsApp nem push quando a página ou o navegador está fechado.

## Permissões do navegador

As permissões são específicas para o endereço do sistema. No Chrome ou Edge, abra as configurações do site pelo ícone ao lado do endereço e permita **Notificações**. Se a permissão foi bloqueada, altere-a nessa tela e recarregue o sistema. Verifique também as notificações do Windows e o modo **Não perturbe**.

Ativar a sincronização do perfil Google no Chrome não altera a permissão de notificações do site.

## Limitações

- O aviso sonoro depende das políticas de áudio do navegador e das configurações de volume do dispositivo.
- Navegadores podem reduzir a frequência de execução das páginas em segundo plano; o aviso pode atrasar.
- Para receber notificações com a página fechada, seria necessário implementar push web com Service Worker, inscrições dos dispositivos e envio pelo backend.
