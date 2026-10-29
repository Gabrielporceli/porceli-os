# MCP do Porceli System (Hermes)

Servidor MCP que dá ao Hermes controle do Porceli System. Roda como Edge
Function no Supabase (`supabase/functions/mcp`).

- **URL:** `https://dygadnfeoiimmbeqbsvt.supabase.co/functions/v1/mcp`
- **Transporte:** Streamable HTTP, sem estado (POST JSON-RPC, resposta JSON)
- **Autenticação:** `Authorization: Bearer <chave>`

## Chaves

Gerenciadas no sistema: **Central de Agentes → MCP → Conexão**. Lá você
copia o endereço, gera chave com nome (ela aparece uma vez, com o trecho de
config pronto), vê o último uso de cada uma e revoga. O banco guarda só o
hash (`mcp_chaves`); cada chamada em `mcp_audit` registra a chave usada.

A "Chave inicial (.env.hermes)" é a primeira, gerada no setup e guardada no
arquivo local `.env.hermes` (fora do git). Pode ser revogada pela tela.

## Configurar no Hermes (VPS)

Em `~/.hermes/config.yaml` (a tela gera este trecho já com a chave):

```yaml
mcp_servers:
  porceli:
    url: "https://dygadnfeoiimmbeqbsvt.supabase.co/functions/v1/mcp"
    headers:
      Authorization: "Bearer <chave>"
```

## Regra principal: o Hermes opera, não grava

O Hermes **não grava direto no banco**. Cada ferramenta de escrita é uma
operação do sistema que repete o passo a passo da tela: criar contrato =
gravar + sincronizar o cliente + gerar os lançamentos + cobrar no Asaas
(+ aviso no WhatsApp). O código fica em `supabase/functions/mcp/operacoes/`,
um arquivo por módulo, cada um apontando para o hook/página da tela que ele
espelha. O cálculo das parcelas é o MESMO arquivo da tela
(`src/lib/contractBilling.ts`, importado pela função).

**Mudou um fluxo na tela? Mude a operação correspondente no MCP.**

| Módulo | Operações | Espelha |
|---|---|---|
| Leitura | `guia_do_sistema`, `listar_tabelas`, `descrever_tabela`, `buscar`, `sql` (somente leitura, travado no banco) | — |
| Clientes | `criar_cliente`, `editar_cliente`, `excluir_cliente` | `useClients.ts`, `Clients.tsx` |
| Contratos | `criar_contrato`, `editar_contrato`*, `renovar_contrato`, `encerrar_contrato`, `excluir_contrato` | `useContracts.ts`, `Contracts.tsx`, `NewContractModal`, `EditContractModal` |
| Financeiro | `marcar_lancamento_pago`, `gerar_lancamentos_faltantes`, `renegociar`*, `criar_despesa`, `pagar_despesa`, `excluir_despesa` | `useFinancialEntries.ts`, `RenegotiationModal.tsx`, `useExpenses.ts` |
| CRM | `criar_lead`, `editar_lead`, `mover_lead`, `excluir_lead` | `useLeads.ts` |
| Agenda | `listar_agenda`, `criar_atividade`, `editar_atividade`, `concluir_tarefa`, `excluir_atividade` | `Calendar.tsx` |
| Notas | `criar_nota`, `editar_nota`, `excluir_nota` | `useNotes.ts`, `sync.ts` |
| Mensagens | `enviar_whatsapp`, `agendar_mensagem`, `cancelar_mensagem` | `useScheduledMessages.ts`, fila `whatsapp_outbox` |
| Outros | `automacoes`, `cadastro` (etapas, tags, planos, ideias, funis) | `useAutomations.ts`, hooks simples |

\* Duas etapas: a 1ª chamada só confere os boletos atuais no Asaas e devolve
`precisa_confirmar`; a 2ª, com `remover_boletos_antigos`, executa.

## Limites

- O Vault (segredos) não é acessível. O SQL é somente leitura no próprio banco.
- Toda chamada fica em `mcp_audit` (ferramenta, argumentos, ok/erro, duração, chave).
- As funções que a tela chama com o usuário logado recebem uma sessão do dono
  gerada pelo servidor (link mágico do admin, sem e-mail).
- Dias trancados da agenda ficam no navegador (localStorage): o MCP não os vê.
- O Nominatim recusa pedido de servidor; o MCP cai no Photon (mesma base OSM).
- A instância é Nano: consulta pesada (ex.: `cron_runs` sem filtro) derruba o
  sistema. O timeout de 15 s existe por isso.
