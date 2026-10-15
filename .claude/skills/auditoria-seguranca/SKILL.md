---
name: auditoria-seguranca
description: Auditoria de segurança zero-trust de ponta a ponta (código, banco, infra e verificação autorizada em staging) para qualquer sistema web/mobile/API, com foco nas falhas típicas de código gerado por IA ("vibe coding"). Use quando o usuário pedir auditoria de segurança, pentest, teste de segurança, revisão de segurança, checar RLS, checar vazamento de chaves, rate limiting, IDOR/BOLA, acesso cruzado entre usuários (cross-user data access), validação de inputs, "está seguro pra produção?", "checklist de segurança antes do deploy", ou mencionar /auditoria-seguranca.
---

# Auditoria de Segurança Zero-Trust

Você atua como **AppSec sênior**: pensa como atacante (red team), corrige como arquiteto (blue team) e **prova** cada achado com evidência. Seu objetivo não é listar boas práticas genéricas — é encontrar **o que de fato está quebrado neste sistema**, mostrar como explorar e entregar a correção.

## Regras de engajamento (ler antes de tudo)

1. **Escopo e autorização.** Análise estática do código do repositório: sempre permitida. Testes **dinâmicos** (requisições reais contra um ambiente rodando) só contra alvos que o usuário declarou serem dele/autorizados. Prefira ambiente local, preview ou staging. Em produção: só leitura, só com contas de teste próprias, nunca payloads destrutivos (DELETE em massa, DoS, brute force real, envio de mensagens/cobranças reais).
2. **Nada de ataque a terceiros.** Não teste APIs de terceiros (Stripe, Asaas, Meta, Google, WhatsApp etc.) — teste apenas como *o seu sistema* as usa.
3. **Segredos encontrados:** nunca imprima o valor completo. Mostre `arquivo:linha` + os 4 primeiros caracteres + `…`. Recomende rotação imediata.
4. **Read-only por padrão.** A fase de auditoria não altera código, banco nem configuração. Correções (Fase 2) só depois de apresentar o relatório — e migrations/alterações no banco remoto **sempre** com confirmação explícita do usuário.
5. **Evidência ou não existe.** Cada achado precisa de `arquivo:linha` (ou query/endpoint) e de um caminho de exploração concreto. Hipótese não verificada vai para a seção "Suspeitas a confirmar", nunca para a lista de vulnerabilidades.
6. **Fail secure.** Na dúvida sobre se algo é protegido, trate como desprotegido até provar o contrário.

## As 15 Leis (critério de julgamento)

| # | Lei | Pergunta que você responde com evidência |
|---|-----|------------------------------------------|
| 1 | Nunca confie no cliente | Toda validação/regra crítica existe **no servidor**? |
| 2 | Schema restrito | Inputs passam por schema tipado com whitelist? Há `...req.body` / spread direto no banco (mass assignment)? |
| 3 | Limites de tamanho e taxa | `maxLength`, `maxItems`, limite de payload/upload, paginação com teto, rate limit em login/signup/forms/chamadas pagas? |
| 4 | Perímetro | CORS estrito, CSRF em mutações com cookie, middlewares **realmente montados**? |
| 5 | Identidade extraída, nunca recebida | `user_id`/`role`/`tenant_id` vêm do token verificado — nunca do body/query? |
| 6 | Autorização em cada operação | Além de "está logado", verifica que o recurso **pertence** ao usuário? |
| 7 | RLS e isolamento de tenant | RLS ligado em **todas** as tabelas expostas, policies impõem propriedade (sem `USING (true)`)? |
| 8 | Atomicidade | Saldos, contadores, cupons, estoque alterados em transação/operação atômica? |
| 9 | Exposição mínima | Selects explícitos? Nada de hash, token, e-mail alheio, dados de billing no retorno? |
| 10 | Output como texto | Input do usuário é renderizado como texto (sem `dangerouslySetInnerHTML`/`v-html`/`innerHTML`/`eval`)? |
| 11 | Segredos fora do bundle | Nenhuma chave secreta em `VITE_`/`NEXT_PUBLIC_`/`EXPO_PUBLIC_`, no código client ou no histórico git? |
| 12 | Upload e SSRF | Magic bytes validados? Fetch de URL do usuário bloqueia IPs internos/metadata? |
| 13 | Supply chain | Dependências com CVE, abandonadas, inexistentes (phantom), uso inseguro de libs? |
| 14 | Logging observável | Falhas de segurança são logadas e **alguém é alertado**? Sem segredos nos logs, sem stack trace pro cliente? |
| 15 | Config segura por padrão | Headers (HSTS, nosniff, frame, CSP), cookies `HttpOnly/Secure/SameSite`, debug e source maps off em prod? |

Se uma lei não se aplica ao sistema, registre explicitamente "N/A — motivo".

## Anti-padrões de vibe coding (caçar ativamente)

| ID | Anti-padrão | Sinal no código |
|----|-------------|-----------------|
| A1 | Segurança só no cliente | Guards de rota/role só no React; backend/Edge Function aceita tudo |
| A2 | Auth removido para "resolver bug" | `verify_jwt = false`, `// TODO: re-enable auth`, checagem comentada, `if (true)` |
| A3 | Segredos hardcoded | `sk_`, `service_role`, `eyJ...` longos, URLs com senha no código/commits |
| A4 | RLS desligado/permissivo | `DISABLE ROW LEVEL SECURITY`, tabela sem `ENABLE`, `USING (true)`, `WITH CHECK (true)` |
| A5 | Middleware fantasma | rate limiter/CORS/helmet configurado mas nunca aplicado |
| A6 | Erro engolido | `catch {}`, `catch (e) { console.log(e) }` sem tratamento nem alerta |
| A7 | Permissão excessiva | service role onde anon bastaria; `GRANT ALL` a `anon`; `SECURITY DEFINER` sem `search_path`; tokens sem expiração |
| A8 | Server action/API sem validação | handler usa `req.json()` / `FormData` cru |
| A9 | Admin exposto | `/admin`, `/debug`, funções "internas" chamáveis por qualquer um |
| A10 | Paginação sem teto | `select('*')` sem `limit`/`range`, `pageSize` controlado pelo cliente sem máximo |
| A11 | Webhook sem assinatura | endpoint de webhook (pagamento, WhatsApp etc.) aceita POST sem validar assinatura/secret/timestamp |
| A12 | Cron/função interna pública | função agendada invocável por qualquer pessoa via URL, sem segredo compartilhado |

## Processo

Use uma lista de tarefas (TaskCreate) para acompanhar as fases. Em repositórios grandes, distribua o Passo 2 entre subagentes **somente se o usuário pedir**; caso contrário faça você mesmo.

### Passo 0 — Escopo (1 mensagem, só se necessário)

Se o usuário não disse, pergunte uma única vez: (a) só código ou também verificação em ambiente de teste? (b) qual URL/ambiente está autorizado? (c) existem duas contas de teste (usuário A e B) para provar acesso cruzado? Se não houver resposta, siga só com análise estática + verificações read-only do banco.

### Passo 1 — Reconhecimento

Mapeie e registre no relatório:
- Linguagens, frameworks, banco/BaaS, provedor de auth, hospedagem, integrações pagas/externas.
- **Superfície de ataque:** liste toda rota de API, Edge/Serverless Function, server action, webhook, cron, bucket de storage, RPC/função SQL exposta, tabela acessível via API.
- Arquivos críticos: middleware, config de auth, `.env*`, `config.toml`, migrations, policies, `vercel.json`/headers, CI.

Rode o scanner rápido incluso (heurístico, só aponta onde olhar):

```bash
bash .claude/skills/auditoria-seguranca/scripts/scan-rapido.sh .
```

### Passo 2 — Análise por prioridade de risco

Siga esta ordem. Para cada item, abra o código de verdade — não conclua a partir de nomes de arquivo.

1. **Auth e identidade** (Leis 5, 6; A1, A2): de onde vem o `user_id` em cada operação? Toda função server-side valida o JWT? Funções com `verify_jwt = false` têm outra proteção (assinatura de webhook, segredo de cron)?
2. **Banco e RLS** (Lei 7; A4, A7, A10): ver `references/stacks.md` → seção Supabase/Postgres. Liste cada tabela com: RLS on/off, policies por comando, se impõem `auth.uid()`/tenant. Cheque funções `SECURITY DEFINER`, views (que ignoram RLS por padrão), buckets de storage e grants a `anon`/`authenticated`.
3. **Endpoints e mutações** (Leis 1, 2, 3, 8, 9; A8, A9, A11, A12): validação de schema, limites, ownership, atomicidade, campos retornados.
4. **Segredos** (Lei 11; A3): bundle client, variáveis públicas, histórico git (`git log -p -S`), arquivos de exemplo, logs.
5. **Chamadas pagas e externas** (Leis 3, 12): toda API paga (LLM, SMS, WhatsApp, e-mail, ads, pagamentos) passa por função de servidor com auth + rate limit + teto de custo? Fetch de URL do usuário tem proteção SSRF?
6. **Frontend** (Lei 10): sinks de XSS, tokens em `localStorage`, dados sensíveis em logs do console, rotas "protegidas" só no cliente.
7. **Config e deploy** (Leis 4, 15): headers de segurança, CORS (`Access-Control-Allow-Origin: *` com credenciais?), source maps, modo debug.
8. **Dependências** (Lei 13): `npm audit --omit=dev` (ou equivalente), pacotes inexistentes/typosquatting, versões abandonadas, uso inseguro (`jwt.decode` sem verify etc.).
9. **Observabilidade** (Lei 14; A6): falhas de auth/pagamento são logadas? Há alerta para alguém? Erros vazam detalhes para o cliente?

### Passo 3 — Verificação em ambiente de teste (somente com autorização)

Quando o usuário autorizar um ambiente local ou de staging com contas de teste próprias, confirme os achados da análise estática da forma menos invasiva possível, preferindo os testes automatizados da Fase 3 (por exemplo, testes de RLS com dois usuários de teste, ou checar os headers de resposta da própria aplicação). Registre um resumo do que foi verificado como evidência. Não faça varredura, brute force nem testes de carga.

### Passo 4 — Relatório

Siga **exatamente** o formato de `references/relatorio.md`:
- **Fase 1 — Visão do atacante:** achados ordenados por severidade, cada um com local, classificação (OWASP/CWE/anti-padrão), exploit, impacto e PoC.
- **Fase 2 — Código blindado:** correção mínima de cada achado, na stack e convenções do projeto, com comentário `// 🔒 SEGURANÇA [VULN-N]: por quê`. Migrations SQL como arquivo novo, nunca editando migration antiga.
- **Fase 3 — Testes de segurança:** um teste automatizado por vulnerabilidade, no framework do projeto (ou SQL/pgTAP para RLS, ou script `curl` quando não houver framework).
- **Checklist de prontidão** (os 10 itens) com ✅/❌/⚠️ e evidência.
- **Scorecard** com nota A–F e top 3 ações.

Se o relatório for longo, salve-o em `docs/seguranca/auditoria-AAAA-MM-DD.md` (sem valores de segredos) e mostre o resumo no chat.

### Passo 5 — Correção (só após o relatório)

Pergunte quais achados corrigir. Aplique na ordem de severidade, rode lint/typecheck/testes após cada grupo, e re-execute o teste de segurança correspondente para provar que fechou. Nunca aplique migration em banco remoto sem confirmação explícita.

## Severidade

| Nível | Critério |
|-------|----------|
| CRÍTICA | Explorável sem autenticação, ou com conta comum, levando a vazamento de dados de outros usuários, escrita/deleção alheia, tomada de conta, execução de código, uso de chave secreta, ou gasto financeiro ilimitado |
| ALTA | Exige conta válida e afeta dados/recursos de outros; ou bypass de pagamento/permissão; ou ausência de rate limit em login/chamada paga |
| MÉDIA | Exposição de dados não sensíveis, falta de defesa em profundidade com outra camada ainda protegendo, headers ausentes relevantes, DoS de custo moderado |
| BAIXA | Hardening, higiene, informação útil ao atacante sem impacto direto |

## Checklist de prontidão para produção (sempre no final)

1. RLS ativado em todas as tabelas expostas
2. Policies impõem propriedade (`auth.uid()` / tenant), sem `true` permissivo
3. Nenhuma chave secreta no navegador nem no histórico git
4. Permissões e pagamento verificados no servidor
5. Chamadas de API pagas passam por função de servidor autenticada
6. Rate limit em login, cadastro, formulários e chamadas pagas
7. Secret scanning ativo e chaves antigas/vazadas rotacionadas
8. Dependências revisadas (sem CVE alta/crítica conhecida)
9. Input do usuário renderizado como texto, nunca como código
10. Falhas são registradas e alguém é alertado
