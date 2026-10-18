# Camada de contas e identidade

A maioria das invasões reais não quebra o código: entra com a senha de alguém (golpe por e-mail, senha repetida, notebook roubado). Esta camada mede isso em dois lados.

## 1. Dentro do sistema (pelo código)

| # | Item | ✅ quando | Se falhar |
|---|------|-----------|-----------|
| C1 | Segundo fator (2FA/MFA) | Existe 2FA (app autenticador, WebAuthn/passkey) e é **obrigatório** para admins | ALTA para sistema com dados pessoais ou financeiros sem 2FA de admin |
| C2 | Sessão | Expira (absoluta e por inatividade), é derrubada ao trocar senha ou desativar a pessoa, cookie `HttpOnly`/`Secure`/`SameSite` | MÉDIA |
| C3 | Senha | Hash lento (argon2id, scrypt, bcrypt ≥ 10), mínimo de 8 (ideal 12+) e checagem contra senhas vazadas (opcional) | MÉDIA a ALTA |
| C4 | Recuperação de conta | Reset por link de uso único, curto, que não revela se o e-mail existe; admin não troca a própria senha sem outro admin | MÉDIA |
| C5 | Contas paradas | Pessoa desativada perde acesso na hora; existe revisão periódica de quem tem acesso | MÉDIA |
| C6 | Ações críticas | Exclusão, mudança de papel, exportação em massa e troca de e-mail exigem confirmação e ficam no registro | MÉDIA |

Procure no código por: `totp|otp|2fa|mfa|webauthn|passkey|authenticator|segundo fator`. Ausência total = C1 falha.

## 2. Fora do sistema (confirmação guiada com o usuário)

Pergunte uma conta por vez, dizendo onde olhar. Peça print ou resposta curta. Nunca peça senha nem código.

| # | Conta | Pergunta e onde conferir | ✅ quando |
|---|-------|--------------------------|-----------|
| X1 | E-mail e Google/Microsoft da empresa | myaccount.google.com > Segurança > Verificação em duas etapas (Workspace: admin.google.com > Segurança > 2SV) | 2FA ativa em todas as contas com acesso aos dados; ideal: chave de segurança ou app, não SMS |
| X2 | Conta que conecta integrações (ex.: Drive do sistema) | Qual conta foi usada? É pessoal ou dedicada? myaccount.google.com > Segurança > Apps de terceiros | Conta dedicada, com acesso só ao necessário e 2FA |
| X3 | Painel da hospedagem (Hostinger, AWS, Vercel...) | Configurações da conta > Segurança > 2FA; quem mais tem acesso | 2FA ativa; só as pessoas necessárias |
| X4 | Domínio e DNS (Registro.br, Cloudflare...) | Quem controla o domínio? Tem 2FA? | 2FA ativa: quem controla o DNS desvia o site e os e-mails |
| X5 | GitHub (ou GitLab) | Settings > Password and authentication; na organização, Settings > Authentication security > Require 2FA; repositório: Settings > Code security (secret scanning, push protection, Dependabot); colaboradores | 2FA obrigatória; secret scanning e push protection ligados; só colaboradores atuais |
| X6 | Serviços integrados (WhatsApp/Evolution, gateway de pagamento, e-mail transacional) | Onde fica o painel? 2FA? O token foi trocado desde a última saída de alguém? | 2FA e tokens trocados após saída de pessoas |
| X7 | Gerenciador de senhas | A equipe usa um (Bitwarden, 1Password)? As senhas de servidor, backup e painéis estão lá, e não só num computador? | Sim, com acesso compartilhado controlado |
| X8 | Computadores com acesso | Os notebooks com chave SSH ou senhas salvas têm disco cifrado (FileVault/BitLocker), bloqueio de tela e chave SSH com senha? | Sim |
| X9 | Saída de pessoas | Existe roteiro de desligamento (tirar do sistema, do GitHub, do painel, trocar senhas compartilhadas)? | Existe e foi usado na última saída |

Quando houver conector (ex.: GitHub MCP), confira X5 você mesmo, só lendo, e diga ao usuário o que foi conferido.

## Como reportar

- Achados com `"camada": "contas"`. C1 sem 2FA para admin em sistema com dados pessoais ou dinheiro: **ALTA**.
- X1 a X9 são quase sempre ações manuais. Escreva o caminho exato do clique em `acoes_manuais`.
- Resposta "não sei" conta como ⚠️ e vai para "Suspeitas a confirmar".
