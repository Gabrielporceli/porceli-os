# Resposta a segredo vazado

Um segredo que já foi commitado deve ser tratado como **comprometido**, mesmo em repositório privado: ele fica no histórico, em forks, clones, caches de CI e nas máquinas de quem já clonou. A ordem abaixo importa.

## 1. Rotacionar (primeiro, sempre)

Gere uma credencial nova no provedor e atualize todos os lugares que a usam: variáveis de ambiente do host, secrets das Edge Functions e do CI, cron jobs do banco.

- **Supabase (`service_role` / JWT secret):** Dashboard → Project Settings → API. No modelo atual de chaves, crie uma nova *secret key* (`sb_secret_…`), migre os usos e então desative a antiga. Nos projetos que ainda usam as chaves JWT legadas, a rotação é feita trocando o JWT secret, o que invalida também a anon key e as sessões ativas. Planeje essa janela.
- **Pagamentos (Asaas, Stripe etc.), Meta, Google, WhatsApp/Evolution, LLMs:** gere uma chave nova no painel do provedor e revogue a anterior.

## 2. Revogar a antiga

Só depois de confirmar que o sistema funciona com a nova chave. Até a revogação, a chave antiga continua válida para qualquer pessoa que a tenha copiado.

## 3. Verificar uso indevido

Revise os logs do período em que a chave esteve exposta: logs de API e de auth do Supabase, painel do provedor (requisições, cobranças, mensagens enviadas), alterações inesperadas em tabelas sensíveis. Registre o que foi verificado.

## 4. Corrigir a causa

- Nunca coloque a chave no código ou na migration. Para `pg_cron`/`pg_net` no Supabase, guarde a credencial no **Supabase Vault** e leia-a na hora da chamada:
  ```sql
  select vault.create_secret('<nova-chave>', 'cron_service_key');  -- rodar uma vez, fora do repositório
  -- no job:
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_service_key')
  )
  ```
  Uma alternativa é um segredo específico do cron, validado pela função, em vez da service role.
- Crie uma migration **nova** que recria os jobs sem a chave literal. Não edite as migrations antigas.
- Ative o secret scanning e a push protection do GitHub, e um hook de pre-commit (gitleaks ou equivalente).

## 5. Limpar o histórico (opcional e por último)

Reescrever o histórico (`git filter-repo`, BFG) **não substitui a rotação**. Ela só reduz exposição futura, exige force-push e quebra os clones de todos. Faça apenas com a concordância do dono do repositório.
