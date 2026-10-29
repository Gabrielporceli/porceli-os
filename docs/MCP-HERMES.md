# MCP do Porceli System (Hermes)

Servidor MCP que dá ao Hermes controle do Porceli System. Roda como Edge
Function no Supabase (`supabase/functions/mcp`).

- **URL:** `https://dygadnfeoiimmbeqbsvt.supabase.co/functions/v1/mcp`
- **Transporte:** Streamable HTTP, sem estado (POST JSON-RPC, resposta JSON)
- **Autenticação:** `Authorization: Bearer <HERMES_MCP_TOKEN>`

A chave fica no arquivo local `.env.hermes` (fora do git) e como segredo da
função no Supabase. Para trocar a chave, gere uma nova, rode
`npx supabase secrets set HERMES_MCP_TOKEN=<nova> --project-ref dygadnfeoiimmbeqbsvt`
e atualize o Hermes.

## Configurar no Hermes (VPS)

Em `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  porceli:
    url: "https://dygadnfeoiimmbeqbsvt.supabase.co/functions/v1/mcp"
    headers:
      Authorization: "Bearer <HERMES_MCP_TOKEN>"
```

## Ferramentas

| Ferramenta | O que faz |
|---|---|
| `guia_do_sistema` | Módulos, tabelas, regras e funções. Primeira leitura do agente. |
| `listar_tabelas` / `descrever_tabela` | Estrutura do banco. |
| `buscar` | Lê linhas com filtros, ordem e limite. |
| `inserir` / `atualizar` / `excluir` | CRUD em qualquer tabela. `user_id` preenchido com o dono; atualizar/excluir exigem filtro. |
| `sql` | SQL livre, leitura e escrita. Timeout 15 s. DROP/TRUNCATE/DELETE ou UPDATE sem WHERE exigem `confirmar_destrutivo: true`. |
| `enviar_whatsapp` | Põe a mensagem na fila `whatsapp_outbox` e dispara o worker. |
| `tarefas_notion` | Listar, criar, atualizar e excluir tarefas no Notion. |
| `agenda_google` | Listar, criar, atualizar e excluir eventos no Google Agenda. |
| `automacoes` | Listar, ligar, desligar, reagendar e disparar os crons do sistema. |
| `chamar_funcao` | Qualquer Edge Function do sistema, como serviço ou como o dono. |

## Limites

- O Vault (segredos) não é acessível.
- Toda chamada fica em `mcp_audit` (ferramenta, argumentos, ok/erro, duração).
- Funções que exigem sessão de usuário (Notion, Agenda, notes-sync) recebem
  uma sessão do dono gerada pelo servidor (link mágico do admin, sem e-mail).
- A instância é Nano: consulta pesada (ex.: `cron_runs` sem filtro) derruba o
  sistema. O timeout de 15 s existe por isso.
