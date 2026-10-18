# Formato obrigatório do relatório

## 0. Resumo de reconhecimento

- Stack: linguagens, frameworks, banco/BaaS, auth, hospedagem
- Superfície: N endpoints/funções, N tabelas, N buckets, N webhooks, N crons
- Escopo coberto: estático / verificação em staging / leitura do banco
- Fora do escopo ou não verificado: …

| Camada | Coberta? | Como | Acesso usado e revogação |
|--------|----------|------|--------------------------|
| Código e banco | | | |
| Infraestrutura | | coleta A / acesso B / tela C / não | |
| Contas e identidade | | | |
| Detecção e resposta | | | |

## 0.5 Modelo de ameaças

Ativos críticos, fronteiras sem proteção e top 5 fluxos por risco (ver `modelagem-ameacas.md`).

## Fase 1: Visão do atacante (red team)

Ordene por severidade (CRÍTICA primeiro). Um bloco por achado:

```
🔴 VULN-[N]: [Nome curto]
├─ Severidade: CRÍTICA | ALTA | MÉDIA | BAIXA   (CVSS 4.0 opcional p/ CRÍTICA/ALTA)
├─ Confiança: Confirmado | Provável
├─ Localização: arquivo:linha | tabela/policy | função
├─ Tipo: [OWASP Top 10 2025 / API Top 10 2023 / LLM Top 10 2025] | [ASVS 5.0 req.] | [CWE-ID] | [A1–A12]
├─ Cenário: como alguém abusaria disso, em linguagem clara
├─ Impacto: o que é obtido (dados, dinheiro, escalação, custo)
└─ Evidência: trecho de código, resultado da query read-only ou teste que comprova
```

Depois disso, uma seção **Suspeitas a confirmar**, com hipóteses sem evidência suficiente e o que falta para confirmar cada uma.

## Fase 2: Código blindado (blue team)

- Reescreva só o que estiver vulnerável. Use a stack e as convenções do projeto.
- Comente o motivo de cada proteção: `// 🔒 SEGURANÇA [VULN-N]: <por quê> (CWE-XXX)`
- Se a correção exigir mudança de arquitetura (migration, nova env var, novo middleware), explique isso antes do código.
- Quando houver várias correções no mesmo arquivo, mostre o arquivo corrigido inteiro uma única vez.
- SQL vai em uma migration nova, nunca editando uma migration já aplicada.

## Fase 3: Testes de segurança

Escreva um teste por vulnerabilidade, no framework do projeto. Para RLS, use SQL ou pgTAP; se o projeto não tiver framework, use Vitest. Dê nomes descritivos:

```
test("VULN-1: usuário B não lê registros do usuário A (RLS/IDOR)")
test("VULN-2: função recusa requisição sem JWT")
test("VULN-3: payload com campo 'role' é rejeitado (mass assignment)")
```

## Checklist de prontidão

| # | Item | Status | Evidência |
|---|------|--------|-----------|
| 1 | RLS ativado em todas as tabelas | ✅/❌/⚠️ | … |
| 2 | Policies impõem propriedade | | |
| 3 | Nenhuma chave secreta no navegador | | |
| 4 | Permissão e pagamento checados no servidor | | |
| 5 | Chamadas pagas passam por função de servidor | | |
| 6 | Rate limit em login, cadastro, formulários e chamadas pagas | | |
| 7 | Secret scanning ativo e chaves antigas rotacionadas | | |
| 8 | Dependências revisadas | | |
| 9 | Input renderizado como texto | | |
| 10 | Falhas logadas e alguém é alertado | | |
| 11 | 2FA obrigatório para admins do sistema | | |
| 12 | 2FA nas contas externas críticas | | |
| 13 | Servidor atualizado, SSH só com chave, firewall fechado | | |
| 14 | Backup fora do servidor, cifrado, restauração testada | | |
| 15 | Plano de resposta a incidentes (LGPD) | | |
| 16 | Acessos de quem saiu revogados | | |

## Re-auditoria (somente no modo re-auditoria)

| VULN anterior | Status | Evidência |
|---------------|--------|-----------|
| VULN-1 … | Corrigida / Aberta / Regrediu | … |

## Scorecard

```
📊 SCORECARD DE SEGURANÇA
├─ CRÍTICAS: X | ALTAS: X | MÉDIAS: X | BAIXAS: X
├─ Confiança: X confirmados | X prováveis | X suspeitas
├─ Anti-padrões detectados: [A1, A4, …]
├─ Nota: [A–F]  (A = pronto para produção, F = risco crítico imediato)
└─ Top 3 ações:
   1. …
   2. …
   3. …
```

Critério da nota: qualquer CRÍTICA dá F. Uma ou mais ALTAS dão D. Só MÉDIAS dão C ou B, conforme a quantidade. Só BAIXAS dão A.
