# Pedir acesso e guiar o usuário (servidor e contas)

Regra de ouro: **o menor acesso possível, pelo menor tempo possível, revogado no fim e registrado no relatório.** A auditoria nunca precisa de senha, nunca precisa de chave privada do usuário e nunca precisa de permissão de escrita.

## O que nunca pedir

- Senhas (de servidor, painel, Google, banco), códigos de 2FA, chaves privadas, conteúdo do `.env` ou dumps do banco.
- Acesso de root ou de administrador de painel.
- Se o usuário colar um segredo no chat por engano: não repita o valor, avise que ele deve ser trocado e registre como ação manual.

## Servidor: escolha a modalidade pelo ambiente

Antes de propor, descubra se esta sessão consegue abrir SSH para fora (`timeout 6 bash -c '</dev/tcp/<host>/22'` e `command -v ssh`). Sessões na nuvem costumam ter a porta 22 bloqueada.

### Modalidade A: coleta assistida (padrão, funciona sempre)

O usuário roda no servidor o script somente leitura da skill e devolve o arquivo. Nenhum acesso é concedido.

Guie assim, um passo por vez:

1. Entregar o script `scripts/coleta-servidor.sh` (enviar o arquivo ao usuário, ou mostrar para ele copiar).
2. Explicar em uma frase o que ele faz e não faz (lê configurações; não altera nada; não lê senhas nem chaves).
3. Pedir que ele envie o arquivo para o servidor e rode como `sudo` (sem sudo, a coleta é parcial):
   ```bash
   scp coleta-servidor.sh <usuario>@<servidor>:/tmp/
   ssh <usuario>@<servidor>
   sudo PASTAS_APP="/srv/<app>" bash /tmp/coleta-servidor.sh
   ```
4. Pedir que ele traga o arquivo de volta (`scp <usuario>@<servidor>:~/coleta-servidor-*.txt .`), revise e anexe na conversa.
5. Ao final: `rm /tmp/coleta-servidor.sh ~/coleta-servidor-*.txt` no servidor.

### Modalidade B: acesso temporário por chave (quando a skill roda na máquina do usuário)

Só quando a sessão consegue fazer SSH e o usuário prefere não rodar nada sozinho.

1. **Gere o par de chaves do seu lado** e mostre ao usuário **apenas a chave pública**. A privada nunca sai da sessão:
   ```bash
   ssh-keygen -t ed25519 -N "" -C "auditoria-$(date +%F)" -f ./chave-auditoria
   cat ./chave-auditoria.pub
   ```
2. Peça que ele crie um usuário próprio, sem senha, com sudo **só para os comandos de leitura**, e com a chave **vencendo sozinha** (OpenSSH 8.2+):
   ```bash
   sudo adduser --disabled-password --gecos "" auditoria
   sudo install -d -m 700 -o auditoria -g auditoria /home/auditoria/.ssh
   # Troque AAAAMMDDHHMM pela data e hora de vencimento (ex.: amanhã) e cole a chave pública no lugar de <CHAVE_PUBLICA>
   echo 'expiry-time="AAAAMMDDHHMM",no-port-forwarding,no-agent-forwarding,no-X11-forwarding <CHAVE_PUBLICA>' | sudo tee /home/auditoria/.ssh/authorized_keys
   sudo chown auditoria:auditoria /home/auditoria/.ssh/authorized_keys && sudo chmod 600 /home/auditoria/.ssh/authorized_keys
   # sudo só para rodar o script de coleta, nada mais
   sudo install -m 755 coleta-servidor.sh /usr/local/sbin/coleta-servidor.sh
   echo 'auditoria ALL=(root) NOPASSWD: /usr/local/sbin/coleta-servidor.sh' | sudo tee /etc/sudoers.d/auditoria
   sudo chmod 440 /etc/sudoers.d/auditoria && sudo visudo -c
   ```
   Se o `AllowUsers` do SSH estiver ligado, ele precisa incluir `auditoria` temporariamente.
3. Rode só `sudo /usr/local/sbin/coleta-servidor.sh` e comandos de leitura. Nada de editar, instalar ou reiniciar.
4. **Revogação (sempre, no fim, com o usuário):**
   ```bash
   sudo deluser --remove-home auditoria && sudo rm /etc/sudoers.d/auditoria /usr/local/sbin/coleta-servidor.sh
   ```
   E apague a chave do seu lado: `rm ./chave-auditoria ./chave-auditoria.pub`. Registre a revogação no relatório.

### Modalidade C: tela compartilhada

O usuário roda os comandos que você indicar, um por vez, e cola a saída. Use quando ele não puder baixar arquivos.

## Contas e serviços externos (Google, painel da hospedagem, GitHub, domínio, e-mail)

Não peça acesso: peça **confirmação guiada**. Para cada conta, diga exatamente onde clicar e o que olhar, e peça um print ou a resposta em uma palavra. Use as perguntas de `contas-e-identidade.md`. Quando houver conector disponível (ex.: GitHub), confira você mesmo, só lendo.

## Verificação externa passiva (pode fazer direto, com o domínio autorizado)

Sem login e sem ataque: só o que qualquer visitante vê. Requisições comuns (`curl -sI https://<dominio>`), certificado TLS (`openssl s_client -connect <dominio>:443 -servername <dominio> </dev/null`), registros de DNS (SPF, DMARC, CAA) e se caminhos sensíveis respondem (`/.env`, `/.git/HEAD`, `/backups/`, mapa de código `*.js.map`). Nada de varredura de portas, força bruta ou envio de formulários.
