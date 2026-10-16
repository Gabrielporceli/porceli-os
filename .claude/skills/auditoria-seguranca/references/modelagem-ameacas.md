# Modelagem de ameaças (rápida, orientada a evidência)

Objetivo: em 10–15 minutos de leitura do código, saber **o que proteger, de quem e onde**. O resultado é uma seção curta no início do relatório, que define a ordem de prioridade da análise.

## 1. Ativos

Liste o que causaria dano se vazasse, fosse alterado ou ficasse indisponível. Para cada um, indique onde ele mora (tabela, bucket, serviço externo):

| Ativo | Exemplos | Onde mora |
|-------|----------|-----------|
| Dados pessoais | nome, telefone, e-mail, CPF, conversas de WhatsApp | |
| Dinheiro | cobranças, saldos, assinaturas, links de pagamento | |
| Credenciais | tokens OAuth de clientes, chaves de API, service role | |
| Capacidade de agir | enviar mensagem em nome do cliente, criar anúncio, disparar cobrança | |
| Custo | chamadas a LLM, SMS, WhatsApp, e-mail, storage | |
| Reputação | conteúdo público, mensagens a terceiros | |

## 2. Atores

| Ator | O que já tem |
|------|--------------|
| Anônimo | URL do app, bundle JS, anon key, endpoints públicos, webhooks |
| Usuário comum | uma conta válida e o próprio JWT |
| Usuário de outro tenant/cliente | conta válida, mas em outra organização |
| Integração externa | consegue chamar seus webhooks (ou alguém se passando por ela) |
| Insider / ex-colaborador | acesso ao repositório e ao histórico git, talvez chaves antigas |
| Admin | tudo. A pergunta é se as ações dele ficam registradas |

## 3. Fronteiras de confiança

Marque cada ponto onde os dados atravessam de um nível de confiança para outro: navegador → API/PostgREST, navegador → Edge Function, provedor externo → webhook, cron → função, função → API paga, função com service role → banco (aqui o RLS deixa de proteger). **Toda fronteira precisa de autenticação e validação próprias.**

## 4. Fluxos sensíveis (escolha os 5 mais críticos)

Para cada fluxo, descreva em uma linha o caminho entrada → processamento → armazenamento → saída, e aplique o STRIDE resumido:

| Letra | Pergunta |
|-------|----------|
| **S**poofing | Alguém consegue se passar por outro usuário ou por um provedor (webhook)? |
| **T**ampering | Alguém consegue alterar valor, dono, status ou preço? |
| **R**epudiation | A ação fica registrada com autor e horário? |
| **I**nformation disclosure | Vaza dados para quem não deveria ver? |
| **D**enial of service / custo | Dá para esgotar recursos ou gerar custo sem limite? |
| **E**levation of privilege | Um usuário comum vira admin ou alcança outro tenant? |

## 5. Saída para o relatório

```
Ativos críticos: …
Fronteiras sem proteção aparente: …
Top 5 fluxos por risco: 1) … 2) … 3) … 4) … 5) …
Ordem de análise resultante: …
```
