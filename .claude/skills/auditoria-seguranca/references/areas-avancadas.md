# Áreas avançadas

Aplique só as seções que existem no sistema. Cada item é uma pergunta que precisa de resposta com evidência (`arquivo:linha`).

## 1. Fluxos de autenticação

- **Cadastro:** confirmação de e-mail obrigatória? Dá para se cadastrar com o e-mail de outra pessoa e herdar dados ou convites dela?
- **Login:** a mensagem de erro diferencia "usuário não existe" de "senha errada" (enumeração)? Há rate limit ou captcha?
- **Reset de senha:** token de uso único, com expiração curta, invalidado após a troca? O link usa uma URL fixa ou um `redirectTo` vindo do cliente, permitindo open redirect ou roubo do token?
- **OAuth / login social e integrações (Google, Meta etc.):** `state` validado no callback? `redirect_uri` em allowlist? Os tokens de clientes ficam só no servidor, criptografados ou ao menos fora do alcance do RLS de outros usuários? O callback associa o token ao usuário da **sessão**, e não a um id vindo da query?
- **Sessão:** logout revoga o refresh token? A troca de senha encerra as outras sessões? Qual a duração do JWT?
- **MFA / papéis administrativos:** contas de admin têm MFA? Rebaixar ou remover um admin tem efeito imediato?
- **Convites e times:** um convite pode ser aceito por outro e-mail? Dá para se convidar para o tenant de outra pessoa?

## 2. Lógica de negócio e dinheiro

- Preço, desconto, plano e status de pagamento são definidos **só** no servidor?
- O webhook de pagamento é idempotente (o mesmo evento duas vezes não credita duas vezes)? Valida assinatura ou token? Confere valor e cliente contra o registro local?
- Renegociação, estorno e cancelamento têm checagem de estado (não dá para estornar algo já estornado)?
- Limites de plano (quantidade de clientes, mensagens, automações) são aplicados no servidor ou só escondidos na interface?
- Operações concorrentes (dois cliques, duas abas) causam duplicidade? Existe constraint `unique` ou lock?
- Automações e envios em massa: há teto por execução e por dia? Um erro pode disparar um loop de envio?

## 3. Funcionalidades de IA / LLM (OWASP Top 10 para LLM 2025)

- **Prompt injection indireta:** conteúdo vindo de usuários ou de terceiros (mensagens recebidas, notas, páginas, e-mails) entra no prompt? O modelo pode, por causa disso, chamar ferramentas ou revelar dados de outro contexto?
- **Ferramentas e ações:** as ferramentas do agente executam com as permissões do usuário que pediu, ou com service role? Ações irreversíveis (enviar, pagar, apagar) exigem confirmação?
- **Saída do modelo:** é renderizada como texto? Nunca vai para `eval`, SQL, shell ou HTML sem escape?
- **Vazamento:** o system prompt ou o contexto contém segredos, ou dados de outros clientes?
- **Custo:** rate limit e teto de tokens por usuário? `max_tokens` definido?

## 4. CI/CD e repositório

- GitHub Actions: `pull_request_target` ou `workflow_run` executando código de PR de fork? Secrets expostos a PRs externos? Actions de terceiros fixadas por SHA?
- `permissions:` mínimas no workflow (o `GITHUB_TOKEN` não deveria ter `write-all`)?
- Branch protegida, revisão obrigatória e secret scanning e push protection ativados no repositório?
- Variáveis de ambiente de Preview/Staging usam chaves de produção?
- Arquivos que não deveriam estar versionados: dumps SQL com dados reais, `.env`, JSON exportado com dados de clientes.

## 5. Privacidade e LGPD

- Quais dados pessoais são coletados e qual a finalidade de cada um? Existe algum dado sem uso?
- Dados sensíveis (saúde, financeiros, conversas) ficam isolados por cliente e com acesso registrado em log?
- Há como atender pedidos de acesso e exclusão do titular? A exclusão apaga também mídias no storage e cópias em logs ou integrações?
- Retenção: mensagens, mídias e logs antigos são apagados automaticamente?
- Logs e ferramentas de monitoramento recebem dados pessoais desnecessários?
- Dados enviados a terceiros (LLM, CRM, ads) estão mapeados?

## 6. Backup e recuperação

- Backups automáticos ativos (no Supabase, PITR conforme o plano)? Alguém já testou uma restauração?
- Existe algum script destrutivo versionado (`drop_all.sql` e similares) que pode ser rodado por engano contra produção? Ele tem alguma trava?
- Quem tem acesso ao painel de produção? Contas de ex-colaboradores foram removidas?

## 7. Mobile, GraphQL e outros (se existir)

- **Mobile:** segredos no binário, certificate pinning em apps de alto risco, deep links que executam ações sem confirmação, dados sensíveis em armazenamento local sem criptografia.
- **GraphQL:** introspecção liberada em produção, limites de profundidade e complexidade, autorização por resolver (não só na query raiz), batching usado para contornar rate limit.
- **WebSockets / Realtime:** a inscrição em canais respeita autorização? (No Supabase Realtime, o RLS se aplica a `postgres_changes`, e canais de broadcast/presence precisam de policies próprias.)
