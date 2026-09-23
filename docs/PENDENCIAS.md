# Pendências — passo a passo

Levantado em 23/09/2026, com os números medidos no dia.

Sete pendências abertas. Cada seção diz **o que é**, **como confirmar que
ainda está aberta**, e **os passos**. O cabeçalho de cada uma marca quem
executa.

Ordem sugerida: 1 → 2 → 3, que são o caminho das notas funcionarem. As
demais são independentes entre si.

> **Antes de qualquer coisa — o comando de verificação deste repositório.**
> `tsc --noEmit` na raiz devolve **0 erros sempre**, porque o `tsconfig.json`
> da raiz tem `"files": []` e só referencia os projetos. Isso já confundiu
> duas sessões de trabalho. O comando que de fato verifica é:
>
> ```bash
> npx tsc --noEmit -p tsconfig.app.json
> ```
>
> Linha de base de hoje: **25 erros**, todos anteriores às notas.

---

## 1. Publicar a `notes-sync` — *eu*

**O que é.** A Edge Function que escreve os `.md` no repositório existe em
`supabase/functions/notes-sync/`, mas nunca foi publicada. O botão
*Sincronizar* na tela de Notas não tem o que chamar.

**Como confirmar.** Painel do Supabase → Edge Functions. Hoje há 21 funções
ativas e nenhuma é a `notes-sync`.

**Passos.**

```bash
supabase functions deploy notes-sync
```

Pode ser publicada **antes** do token existir: sem o secret ela responde
`NOTES_GITHUB_TOKEN não configurado`, que é justamente o que a tela mostra
no campo de último erro.

---

## 2. Preparar o cofre e o token — *você*

**O que é.** Sem repositório e sem token, não há para onde sincronizar.

**Passos.**

1. **Criar o repositório** do cofre no GitHub, privado.
2. **Instalar o plugin Obsidian Git** no seu cofre local e ligar o
   `pull`/`push` automático. É ele que traz para o seu Obsidian o que o CRM
   escrever, e leva ao repositório o que você escrever no Obsidian.
3. **Criar um token fine-grained** com acesso **só a esse repositório** e
   permissão **Contents: Read and write**.
   - Se usar token clássico, o escopo necessário é `repo`, que dá acesso a
     **todos** os seus repositórios. Prefira o fine-grained.
4. **Guardar como secret** — não mande o token por chat:

```bash
supabase secrets set NOTES_GITHUB_TOKEN=github_pat_...
```

---

## 3. Configurar e testar a sincronização — *você*

**Passos.**

1. Entrar no sistema e abrir **Notas**.
2. Clicar em **Cofre** e preencher repositório (`usuario/repo`), branch e
   subpasta. Ligar o toggle. Salvar.
3. Criar uma nota, escrever algo, clicar em **Sincronizar**.
4. Conferir no GitHub que apareceu `<subpasta>/<Título>.md`, com o
   frontmatter no topo.
5. Abrir o cofre no Obsidian e confirmar que a nota aparece, e que as
   `tags` do frontmatter aparecem no painel de tags dele.

**Se falhar.** A mensagem aparece no toast e fica guardada em
`notes_sync_config.last_error`, visível no próprio diálogo do Cofre.
`409` significa que o arquivo mudou no cofre desde a última sincronização
— ou seja, foi editado no Obsidian. Enquanto a sincronização é só de ida,
isso é reportado em vez de sobrescrever.

**O que nunca foi exercitado.** Criar, editar, excluir nota e salvar a
configuração exigem sessão; sem login eu não consigo rodar nenhum desses
caminhos. Este passo é o primeiro teste real do CRUD.

---

## 4. Toasts invisíveis em 8 arquivos — *decisão sua, execução minha*

**O que é.** O `App.tsx` monta apenas o `<Toaster />` do **sonner**. O
`src/components/ui/toaster.tsx`, que desenha os toasts do `useToast` do
shadcn, **não é montado em lugar nenhum**. Resultado: todo `toast()` vindo
de `useToast` é engolido em silêncio — erros nunca chegam à tela.

**Como confirmar.**

```bash
grep -rn "ui/toaster" src/App.tsx src/main.tsx   # não acha nada
grep -rl "@/hooks/use-toast" src/ | grep -v "components/ui\|hooks/use-toast"
```

São **8 arquivos** de aplicação, incluindo `useFunnelMaps`.

**Por que ainda não fiz.** Montar o segundo Toaster é uma linha, mas faria
8 arquivos passarem a exibir avisos que hoje ninguém vê. Pode aparecer
ruído inesperado em telas que você já usa.

**Opção A — montar o Toaster (uma linha).**

```tsx
// src/App.tsx
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
// ...
<ShadcnToaster />
```

**Opção B — migrar os 8 arquivos para `sonner`**, que é o que o resto do
sistema (`useAuth`, `useClients`, `useContracts`, `useAutomations`) já usa.
Mais trabalho, mas deixa um sistema de toast só.

Recomendo a **B**: dois sistemas de notificação convivendo é a origem do
problema, e a A mantém os dois.

---

## 5. `types.ts` desatualizado — *eu*

**O que é.** O arquivo de tipos do Supabase não bate com o banco: faltam
tabelas que existem e sobram tabelas já derrubadas. É a causa da maioria
dos 25 erros de tipo.

**Como confirmar.**

```bash
npx tsc --noEmit -p tsconfig.app.json | grep "Argument of type"
```

Hoje acusa `automations` e `scheduled_messages` — duas tabelas que
**existem no banco** e não estão no arquivo.

**Passos.**

```bash
supabase gen types typescript --project-id dygadnfeoiimmbeqbsvt > src/integrations/supabase/types.ts
npx tsc --noEmit -p tsconfig.app.json
```

**Dois cuidados.**

- Este arquivo já precisou de conserto manual uma vez: a geração deixou
  `\n` literais no meio de declarações e quebrou o parse. Confira depois.
- A regeneração muda a base de erros **nos dois sentidos**: some com os de
  tabela ausente, mas pode acusar código que usa tabelas já derrubadas —
  que é exatamente a pendência 6.

Vale commit próprio, separado de qualquer outra mudança.

---

## 6. `meta_report_configs` é código morto — *decisão sua*

**O que é.** `src/hooks/useMetaReportConfigs.ts` consulta a tabela
`meta_report_configs`, que **não existe no banco**. Mesmo caso do
`recurring_tasks` que já foi removido do Calendar.

**Como confirmar.** A lista de tabelas do projeto `dygadnfeoiimmbeqbsvt`
tem 20 tabelas e nenhuma é `meta_report_configs`.

**A decisão.** Ou a funcionalidade de relatórios da Meta nunca foi
concluída (e o hook deve ser removido), ou a tabela foi derrubada por
engano (e precisa voltar). Eu não sei qual dos dois — depende do que você
pretendia com o `meta-ads-report`, que é uma Edge Function publicada e
ativa.

Enquanto não se decide, são 6 erros de tipo permanentes.

---

## 7. `notion_config` e `notion_tasks` com RLS sem política — *eu*

**O que é.** As duas tabelas têm RLS ligado e **nenhuma política criada**.
Na prática isso bloqueia todo acesso pelo cliente — o que pode ser
intencional (só as Edge Functions escrevem nelas, usando a service role),
ou pode ser um esquecimento que deixou uma tela quebrada sem ninguém notar.

**Como confirmar.** Painel do Supabase → Advisors → Security. Aparecem como
`rls_enabled_no_policy`, nível INFO.

**Passos, se for esquecimento** — a política no padrão das outras tabelas:

```sql
CREATE POLICY "Users can manage own notion_tasks"
  ON public.notion_tasks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

> Atenção: `notion_tasks` **não tem coluna `user_id`** hoje. Se o acesso
> pelo cliente for necessário, a coluna precisa existir antes — o que torna
> isto uma migração, não uma política solta.

Se o acesso for mesmo só pelas Edge Functions, não há o que fazer: o aviso
é informativo e a configuração está correta.

---

## Resumo

| # | pendência | quem | bloqueia |
|---|---|---|---|
| 1 | publicar `notes-sync` | eu | o botão Sincronizar |
| 2 | repositório + token + secret | você | tudo da sincronização |
| 3 | configurar e testar | você | primeiro teste real do CRUD |
| 4 | toasts invisíveis | decisão sua | erros não aparecem na tela |
| 5 | regenerar `types.ts` | eu | ~16 erros de tipo |
| 6 | `meta_report_configs` morto | decisão sua | 6 erros de tipo |
| 7 | RLS sem política no Notion | eu | possivelmente nada |
