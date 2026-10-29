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
