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

### Modalidade B: acesso temporário automatizado (quando a sessão consegue SSH)

Use `scripts/acesso-auditoria.sh`. Ele funciona no Linux, no macOS e no Git Bash do Windows (o Claude Code no Windows usa o Git Bash). O usuário só cola **um bloco**, uma vez, no terminal do servidor (o do navegador da Hostinger serve).

```bash
bash scripts/acesso-auditoria.sh preparar <host> --horas 4 --pastas "/srv/<app>"   # gera a chave e imprime o bloco para colar
bash scripts/acesso-auditoria.sh coletar  <host>                                  # entra e traz a coleta
bash scripts/acesso-auditoria.sh revogar  <host>                                  # apaga o acesso e confirma
bash scripts/acesso-auditoria.sh situacao <host>                                  # registro e se o acesso ainda funciona
```

O que o bloco cria no servidor (testado de ponta a ponta):
- usuário `auditoria`, sem senha, só com a chave gerada na sessão (a privada nunca sai da máquina de quem audita);
- chave com `expiry-time` (1 a 72 horas) e sem túnel, sem repasse e sem terminal interativo;
- sudo **só** para dois comandos fixos e sem argumentos: `coleta-auditoria` (a coleta somente leitura) e `revogar-auditoria`. `sudo bash`, `sudo cat /etc/shadow` ou argumentos extras são recusados;
- o script de coleta vai embutido no bloco, conferido por SHA-256 e com dono root: o usuário `auditoria` não consegue trocá-lo.

Fluxo da skill:
1. Antes, teste se a sessão abre SSH (`command -v ssh` e `timeout 6 bash -c '</dev/tcp/<host>/22'`). Se não abrir (sessão na nuvem), use a modalidade A.
2. `preparar` e mostre o bloco ao usuário, explicando em 3 linhas o que ele cria e quando vence.
3. Peça que ele cole e responda com a última linha ("PRONTO" e a impressão digital do servidor).
4. `coletar`; compare a impressão digital mostrada com a que o bloco imprimiu. Se forem diferentes, pare: pode não ser o servidor certo.
5. Avalie a coleta (`infraestrutura.md`).
6. `revogar` **sempre**, mesmo se algo deu errado antes. Se a revogação automática não confirmar, o script imprime o bloco de limpeza manual: entregue ao usuário e só encerre quando ele responder "LIMPO".
7. Copie o `registro.txt` (preparado, coleta, revogação, com data e hora) para a seção de cobertura do relatório.

Este acesso é **só para auditar**. Corrigir algo no servidor é outra etapa, com aprovação do usuário para cada mudança e um acesso separado.

Na avaliação, procure também **acessos que outras ferramentas deixaram para trás** (outro agente de IA, um técnico que já saiu): chaves em `authorized_keys` sem dono conhecido, usuários extras, arquivos em `/etc/sudoers.d/` e tarefas no cron que ninguém reconhece. Pergunte ao usuário quem é cada chave.

### Modalidade C: tela compartilhada

O usuário roda os comandos que você indicar, um por vez, e cola a saída. Use quando ele não puder baixar arquivos.

## Contas e serviços externos (Google, painel da hospedagem, GitHub, domínio, e-mail)

Não peça acesso: peça **confirmação guiada**. Para cada conta, diga exatamente onde clicar e o que olhar, e peça um print ou a resposta em uma palavra. Use as perguntas de `contas-e-identidade.md`. Quando houver conector disponível (ex.: GitHub), confira você mesmo, só lendo.

## Verificação externa passiva (pode fazer direto, com o domínio autorizado)

Sem login e sem ataque: só o que qualquer visitante vê. Requisições comuns (`curl -sI https://<dominio>`), certificado TLS (`openssl s_client -connect <dominio>:443 -servername <dominio> </dev/null`), registros de DNS (SPF, DMARC, CAA) e se caminhos sensíveis respondem (`/.env`, `/.git/HEAD`, `/backups/`, mapa de código `*.js.map`). Nada de varredura de portas, força bruta ou envio de formulários.
