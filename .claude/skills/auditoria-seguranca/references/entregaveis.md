# Entregáveis finais: diagnóstico em PDF + plano prático + prompt de correção

Ao final de toda auditoria (exceto no modo **diff**, em que basta o relatório no chat, a menos que o usuário peça o PDF):

1. Crie a pasta `docs/seguranca/AAAA-MM-DD/` (se já existir uma do mesmo dia, acrescente `-2`, `-3`…).
2. Grave nela o `achados.json`, seguindo o schema abaixo.
3. Rode:
   ```bash
   python3 .claude/skills/auditoria-seguranca/scripts/gerar_entregaveis.py docs/seguranca/AAAA-MM-DD/achados.json
   ```
4. O script gera `diagnostico.pdf`, `diagnostico.html` e `prompt-correcao.md`. Se o PDF falhar por falta de navegador, avise o usuário e indique o HTML (Imprimir → Salvar como PDF).
5. Abra o PDF gerado (com a ferramenta de leitura de arquivos) e confira se ele está completo e legível antes de entregar.
6. Na resposta final, entregue: a nota, as contagens, as top 3 ações, as ações manuais e os caminhos dos 3 arquivos. Se a ferramenta SendUserFile estiver disponível, envie o PDF e o prompt por ela.

**Atenção a segredos:** o JSON, o PDF e o prompt **nunca** podem conter valores de segredos, só `arquivo:linha` e o prefixo (`eyJhb…`). O script mascara padrões conhecidos como defesa extra, mas a responsabilidade é sua. Avise o usuário se `docs/seguranca/` não deve ser versionada (o diagnóstico expõe o mapa de vulnerabilidades do sistema). Se o repositório for público, sugira adicioná-la ao `.gitignore`.

## Schema do `achados.json`

```jsonc
{
  "projeto": "Nome do sistema",
  "data": "AAAA-MM-DD",
  "modo": "completo | foco | re-auditoria | diff",
  "escopo": "O que foi coberto e o que ficou de fora",
  "stack": ["React + Vite", "Supabase (Postgres, Auth, Edge Functions)", "Vercel"],
  "cobertura": {                           // as 4 camadas: o que foi coberto e o que ficou de fora, com o motivo
    "codigo": "Coberta: todo o repositório",
    "infraestrutura": "Coberta pela coleta somente leitura de 18/10 (modalidade A) e verificação externa passiva",
    "contas": "Parcial: código e GitHub conferidos; Google e hospedagem confirmados pelo usuário; domínio sem resposta",
    "deteccao": "Coberta; plano de incidentes gerado como rascunho"
  },
  "resumo_executivo": "3 a 6 frases para quem não é técnico: o risco principal, o que pode acontecer e o que fazer primeiro.",
  "nota": "A | B | C | D | F",            // opcional: se omitido, é calculado pelas contagens
  "top_acoes": ["…", "…", "…"],           // opcional: padrão = os 3 achados mais graves
  "modelo_ameacas": {
    "ativos": ["Conversas de WhatsApp de clientes (tabela messages)"],
    "fronteiras": ["Webhook de pagamento → Edge Function sem validação de assinatura"],
    "fluxos": ["Cobrança: criar cliente → gerar cobrança → webhook de confirmação"]
  },
  "acoes_manuais": [                       // o que só o usuário faz: painéis, rotação de chaves, configurações de conta
    "Gerar nova secret key no Supabase (Settings → API) e desativar a antiga"
  ],
  "achados": [
    {
      "id": "VULN-1",
      "titulo": "Curto e específico",
      "severidade": "CRÍTICA | ALTA | MÉDIA | BAIXA",
      "confianca": "Confirmado por exploração | Confirmado | Provável",
      "camada": "codigo | infraestrutura | contas | deteccao",
      "local": "arquivo:linha, tabela/policy ou função",
      "tipo": "OWASP A01:2025 | API1:2023 | ASVS 5.0 V8.x | CWE-639 | A4",
      "cenario": "Como alguém abusaria disso, em linguagem clara",
      "impacto": "O que se obtém",
      "evidencia": "Trecho de código ou resultado de query read-only (sem segredos)",
      "correcao": "O que mudar, de forma objetiva o bastante para outro agente executar",
      "teste": "Teste automatizado que falha antes e passa depois",
      "criterio_aceite": "Condição verificável de 'pronto'",
      "esforco": "P | M | G",
      "manual": false,                     // true = se resolve fora do código (DNS, painel, conta): vai para as ações manuais do prompt, não vira tarefa do agente
      "prazo": "hoje | 7d | 30d | backlog"   // opcional: padrão por severidade (CRÍTICA→hoje, ALTA→7d, MÉDIA→30d, BAIXA→backlog)
    }
  ],
  "suspeitas": [ { "titulo": "…", "o_que_falta": "…" } ],
  "checklist": [
    { "item": "RLS ativado em todas as tabelas", "status": "ok | falha | parcial | na", "evidencia": "…" }
    // os 16 itens do checklist de prontidão, na ordem (camada não coberta = "parcial" com "não verificado")
  ],
  "reauditoria": [ { "id": "VULN-1 (2026-09-01)", "status": "Corrigida | Aberta | Regrediu", "evidencia": "…" } ]
}
```

## Qualidade do plano e do prompt

O prompt gerado será executado por **outro agente, sem o contexto desta auditoria**. Por isso, cada achado precisa se sustentar sozinho:
- `local` com caminho relativo à raiz do repositório e linha.
- `correcao` concreta: o que mudar e onde. "Melhorar a segurança" não serve; "criar migration que habilita RLS em `public.x` e adiciona policy `owner_id = auth.uid()` para SELECT, INSERT, UPDATE e DELETE" serve.
- `teste` e `criterio_aceite` verificáveis por máquina sempre que possível.
- Dependências entre itens explícitas na `correcao` (ex.: "fazer depois da VULN-1").
- Tudo que exige painel, conta ou decisão humana vai para `acoes_manuais`, não para os achados.
