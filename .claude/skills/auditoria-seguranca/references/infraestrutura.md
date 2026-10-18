# Camada de infraestrutura (servidor, rede, domínio)

Fonte dos dados: o arquivo de `scripts/coleta-servidor.sh` (ver `acesso-temporario.md`) e a verificação externa passiva. Cada linha abaixo vira ✅, ❌ ou ⚠️ no relatório, com a evidência copiada da coleta.

## Critérios

| # | Item | ✅ quando | Se falhar |
|---|------|-----------|-----------|
| I1 | Atualizações de segurança | 0 pacotes `-security` pendentes e `unattended-upgrades` ativo; sem reinício pendente há mais de 7 dias | ALTA se houver kernel/openssh/nginx com atualização de segurança pendente |
| I2 | Login SSH | `permitrootlogin no`, `passwordauthentication no`, `kbdinteractiveauthentication no`, `maxauthtries` ≤ 4 | ALTA (senha ou root liberados) |
| I3 | Chaves autorizadas | Só chaves de pessoas atuais, cada uma identificada pelo comentário; nenhuma de ex-colaborador nem de acesso temporário antigo (outro agente de IA, técnico); preferir `ed25519` | MÉDIA (chave órfã = acesso de quem saiu); ALTA se a chave órfã tiver sudo |
| I4 | Sudo | Só os usuários necessários; `NOPASSWD: ALL` só se justificado | MÉDIA |
| I5 | Firewall | Ativo, negando por padrão, só as portas necessárias (ex.: 22, 80, 443) | ALTA se banco, painel ou app (porta interna) estiver aberto para a internet |
| I6 | Portas escutando | Banco, Redis, app Node, painéis em `127.0.0.1`, não em `0.0.0.0` | ALTA |
| I7 | Força bruta | fail2ban (ou CrowdSec) ativo na jail do SSH; e limite no Nginx (`limit_req`) nas rotas de login | MÉDIA |
| I8 | TLS | Certificado válido por mais de 15 dias, renovação automática ativa, só TLS 1.2+ | ALTA se vencer em menos de 7 dias |
| I9 | Nginx | `server_tokens off`, HTTP redireciona para HTTPS, sem `autoindex on`, `client_max_body_size` coerente, sem segredo em caminho logado | BAIXA a MÉDIA |
| I10 | Segredos no disco | `.env` com permissão `600` (ou `640` com grupo da app), dono = usuário da app; banco e backups sem leitura para outros | ALTA se `.env` ou banco legíveis por todos |
| I11 | Escrita para todos | Nenhum arquivo da aplicação com permissão de escrita para outros | ALTA |
| I12 | Processo da app | Roda com usuário próprio, não root | ALTA se rodar como root |
| I13 | Backups | Cópia fora do servidor, recente (menos de 48 h), cifrada, com retenção definida; log sem erro | ALTA se não houver cópia fora do servidor |
| I14 | Restauração testada | Existe registro de um teste de restauração nos últimos 6 meses | MÉDIA |
| I15 | Logs | Journal persistente, rotação configurada, guarda de pelo menos 90 dias para autenticação | BAIXA |
| I16 | Relógio | NTP sincronizado (logs e tokens dependem disso) | BAIXA |

## Verificação externa passiva (do domínio público)

| # | Item | ✅ quando |
|---|------|-----------|
| E1 | Cabeçalhos | HSTS, CSP, `X-Content-Type-Options`, `frame-ancestors`/`X-Frame-Options`, `Referrer-Policy` presentes na resposta real (não só no código) |
| E2 | Nada sensível exposto | `/.env`, `/.git/HEAD`, `/backups/`, `/*.js.map`, `/server-status` devolvem 404/403 |
| E3 | HTTP → HTTPS | `http://` redireciona com 301 para `https://` |
| E4 | Certificado | Válido, cadeia completa, sem TLS 1.0/1.1 |
| E5 | E-mail do domínio | SPF e DMARC (`p=quarantine` ou `reject`) publicados: dificulta e-mail falso em nome da empresa (golpe contra clientes e equipe) |
| E6 | CAA | Registro CAA limitando quem emite certificado (opcional, BAIXA) |

## Como reportar

- Cada falha vira um achado com `"camada": "infraestrutura"`, local = item da coleta (ex.: `coleta: 3. SSH`) e evidência = linha da coleta.
- Correções de servidor são quase sempre **ações manuais** (vão para `acoes_manuais` com o comando exato), salvo quando o repositório tem script de preparação do servidor: aí a correção também entra no script, para não voltar num servidor novo.
- Nunca aplique nada no servidor durante a auditoria.
