# Verificações específicas por stack

Carregue apenas as seções da stack detectada no reconhecimento.

## Supabase / Postgres

### Inventário de RLS (rodar via MCP `execute_sql` ou `psql`, somente leitura)

```sql
-- Tabelas expostas sem RLS
select n.nspname as schema, c.relname as tabela, c.relrowsecurity as rls_on, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r','p') and n.nspname in ('public')
order by c.relrowsecurity, c.relname;

-- Todas as policies e suas expressões
select schemaname, tablename, policyname, cmd, roles, qual as using_expr, with_check
from pg_policies where schemaname = 'public' order by tablename, cmd;

-- Policies permissivas suspeitas
select tablename, policyname, cmd, roles, qual, with_check from pg_policies
where schemaname='public' and (qual = 'true' or with_check = 'true' or roles @> '{anon}');

-- Funções SECURITY DEFINER (rodam como dono, ignoram RLS) e search_path
select p.proname, p.prosecdef as security_definer, p.proconfig as config
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.prosecdef;

-- Grants amplos para anon/authenticated
select grantee, table_name, privilege_type from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated') order by table_name;

-- Views (por padrão rodam com permissões do dono → furam RLS, exceto com security_invoker)
select c.relname, c.reloptions from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='v';

-- Buckets de storage e policies
select id, name, public from storage.buckets;
select policyname, cmd, qual, with_check from pg_policies where schemaname='storage';
```

Também rode `get_advisors` (tipo `security`) do MCP do Supabase, se disponível.

### O que reprovar
- Tabela em `public` com `rls_on = false`.
- Policy `USING (true)` / `WITH CHECK (true)` em tabela com dados de usuário.
- `UPDATE` com `USING` mas sem `WITH CHECK` (permite mover a linha para outro dono).
- Policy que confia em coluna editável pelo próprio usuário (ex.: `role` na tabela `profiles` sem impedir que ele mesmo a altere → escalação de privilégio).
- Policy baseada em `auth.jwt() -> 'user_metadata'` (editável pelo usuário). Use `app_metadata`.
- `SECURITY DEFINER` sem `set search_path = ''` ou sem checar `auth.uid()` internamente.
- View sem `security_invoker = true` sobre tabela com RLS.
- Bucket `public = true` com arquivos privados; policies de storage sem `(storage.foldername(name))[1] = auth.uid()::text` ou equivalente.
- `service_role` usada no frontend ou em `VITE_*`.

### Edge Functions
- `supabase/config.toml`: cada `[functions.X] verify_jwt = false` precisa de justificativa (webhook com assinatura, cron com segredo). Caso contrário, é A2/A12.
- Dentro da função: o cliente Supabase é criado com o JWT do usuário (respeita RLS) ou com service role (ignora RLS)? Se service role, **toda** query precisa filtrar pelo usuário extraído de `supabase.auth.getUser(token)` — nunca de `body.user_id`.
- CORS: `Access-Control-Allow-Origin: *` é aceitável só sem cookies; prefira allowlist.
- Validação do body (zod ou equivalente), limites de tamanho, try/catch que não vaza `error.message` interno.
- Webhooks: validar assinatura/token do provedor (ex.: header de token do Asaas, `X-Hub-Signature-256` da Meta) e idempotência (mesmo evento 2x não processa 2x).

## Vite / React / SPA

- Tudo em `import.meta.env.VITE_*` vai para o bundle público. Liste cada uma e classifique: pública por natureza (URL, anon key) vs. secreta (qualquer outra chave de API).
- `vite build` com `build.sourcemap: true` em prod expõe o código-fonte.
- Rotas protegidas só por `<ProtectedRoute>` não protegem dados — confirme que o backend/RLS bloqueia.
- Busque: `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function(`, `href={` com URL do usuário (`javascript:`), markdown renderizado sem sanitização.
- Tokens: o SDK do Supabase guarda sessão em `localStorage` — aceitável, mas aumenta impacto de qualquer XSS; reforça a necessidade de CSP.

## Next.js
- `NEXT_PUBLIC_*` é público. Server Actions são endpoints POST públicos: cada uma precisa de auth + validação própria.
- `middleware.ts` com `matcher` que não cobre `/api/*` ou rotas novas.
- Route handlers retornando objetos completos do ORM.

## Express / Fastify / Node
- `app.use(helmet())`, `cors({origin: [...]})`, rate limiter — confirme que estão montados **antes** das rotas.
- `express.json({ limit })` definido.
- `jwt.verify` com algoritmo fixo; nunca `jwt.decode` para autorização.

## Python (Django / FastAPI / Flask)
- `DEBUG = False`, `ALLOWED_HOSTS`, `SECRET_KEY` fora do código.
- `yaml.safe_load`, nada de `pickle` com dados externos, queries parametrizadas.
- FastAPI: `Depends(get_current_user)` em toda rota sensível; modelos Pydantic com `extra='forbid'`.

## Firebase
- Regras do Firestore/Storage: nada de `allow read, write: if true` ou `if request.auth != null` sem checar dono.

## Vercel / hospedagem
- `vercel.json` → `headers`: HSTS, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, CSP.
- Variáveis de ambiente de Preview com chaves de produção.
- Deploys de preview públicos com dados reais.

## Integrações pagas (LLM, WhatsApp, SMS, e-mail, Ads, pagamentos)
- Chave só no servidor; função exige usuário autenticado; rate limit por usuário; teto diário de custo; log de uso.
- Pagamentos: status de "pago" vem do webhook/consulta ao provedor, nunca de parâmetro enviado pelo cliente. Valor cobrado calculado no servidor.
